import type { App_RoutingForms_Form } from "@prisma/client";
import type { z } from "zod";

import { entityPrismaWhereClause } from "@calcom/lib/entityPermissionUtils";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

import type { SerializableForm, SerializableFormTeamMembers } from "../types/types";
import type { zodRoutesView, zodFieldsView } from "../zod";
import { zodFields, zodRoutes } from "../zod";
import getConnectedForms from "./getConnectedForms";
import isRouter from "./isRouter";
import isRouterLinkedField from "./isRouterLinkedField";
import { getFieldWithOptions } from "./selectOptions";

const log = logger.getSubLogger({ prefix: ["getSerializableForm"] });
/**
 * Doesn't have deleted fields by default
 */
export async function getSerializableForm<TForm extends App_RoutingForms_Form>({
  form,
  withDeletedFields = false,
}: {
  form: TForm;
  withDeletedFields?: boolean;
}) {
  const prisma = (await import("@calcom/prisma")).default;
  const routesParsed = zodRoutes.safeParse(form.routes);
  if (!routesParsed.success) {
    log.error("Error parsing routes", safeStringify({ error: routesParsed.error, routes: form.routes }));
    throw new Error("Error parsing routes");
  }

  const fieldsParsed = zodFields.safeParse(form.fields);

  if (!fieldsParsed.success) {
    throw new Error(`Error parsing fields: ${fieldsParsed.error}`);
  }

  const settings = RoutingFormSettings.parse(
    form.settings || {
      // Would have really loved to do it using zod. But adding .default(true) throws type error in prisma/zod/app_routingforms_form.ts
      emailOwnerOnSubmission: true,
    }
  );

  const parsedFields =
    (withDeletedFields ? fieldsParsed.data : fieldsParsed.data?.filter((f) => !f.deleted)) || [];
  const parsedRoutes = routesParsed.data;
  const fields = parsedFields as NonNullable<z.infer<typeof zodFieldsView>>;

  const fieldsExistInForm: Record<string, true> = {};
  parsedFields.forEach((f) => {
    fieldsExistInForm[f.id] = true;
  });

  const { routes, routers } = await getEnrichedRoutesAndRouters(parsedRoutes, form.userId);

  const connectedForms = (await getConnectedForms(prisma, form)).map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
  }));

  const finalFields = fields.map((field) => getFieldWithOptions(field));

  let teamMembers: SerializableFormTeamMembers[] = [];
  if (form.teamId) {
    teamMembers = await prisma.user.findMany({
      where: {
        teams: {
          some: {
            teamId: form.teamId,
            accepted: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        defaultScheduleId: true,
      },
    });
  }

  // Ideally we should't have needed to explicitly type it but due to some reason it's not working reliably with VSCode TypeCheck
  const serializableForm: SerializableForm<TForm> = {
    ...form,
    settings,
    fields: finalFields,
    routes,
    routers,
    connectedForms,
    teamMembers,
    createdAt: form.createdAt.toString(),
    updatedAt: form.updatedAt.toString(),
  };
  return serializableForm;

  /**
   * Enriches routes that are actually routers and returns a list of routers separately
   */
  async function getEnrichedRoutesAndRouters(parsedRoutes: z.infer<typeof zodRoutes>, userId: number) {
    const routers: { name: string; description: string | null; id: string }[] = [];
    const routes: z.infer<typeof zodRoutesView> = [];
    if (!parsedRoutes) {
      return { routes, routers };
    }

    for (const [, route] of Object.entries(parsedRoutes)) {
      if (isRouter(route)) {
        const router = await prisma.app_RoutingForms_Form.findFirst({
          where: {
            id: route.id,
            ...entityPrismaWhereClause({ userId: userId }),
          },
        });
        if (!router) {
          throw new Error(`Form - ${route.id}, being used as router, not found`);
        }

        const parsedRouter = await getSerializableForm({ form: router });

        routers.push({
          name: parsedRouter.name,
          description: parsedRouter.description,
          id: parsedRouter.id,
        });

        // Enrichment
        routes.push({
          ...route,
          isRouter: true,
          name: parsedRouter.name,
          description: parsedRouter.description,
          routes: parsedRouter.routes || [],
        });

        parsedRouter.fields?.forEach((field) => {
          if (!fieldsExistInForm[field.id]) {
            // Instead of throwing error, Log it instead of breaking entire routing forms feature
            console.error(
              "This is an impossible state. A router field must always be present in the connected form."
            );
          } else {
            const currentFormField = fields.find((f) => f.id === field.id);
            if (!currentFormField || !("routerId" in currentFormField)) {
              return;
            }
            if (!isRouterLinkedField(field)) {
              currentFormField.routerField = field;
            }
            currentFormField.router = {
              id: parsedRouter.id,
              name: router.name,
              description: router.description || "",
            };
          }
        });
      } else {
        routes.push(route);
      }
    }
    return { routes, routers };
  }
}
