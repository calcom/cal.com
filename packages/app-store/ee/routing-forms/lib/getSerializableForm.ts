import { App_RoutingForms_Form } from "@prisma/client";
import { z } from "zod";

import logger from "@calcom/lib/logger";
import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

import isRouter from "../isRouter";
import { SerializableForm } from "../types/types";
import { zodFields, zodRoutes, zodRoutesView, zodFieldsView } from "../zod";

/**
 * Doesn't have deleted fields by default
 */
export async function getSerializableForm<TForm extends App_RoutingForms_Form>(
  prisma: typeof import("@calcom/prisma").default,
  form: TForm,
  withDeletedFields = false
) {
  const routesParsed = zodRoutes.safeParse(form.routes);
  if (!routesParsed.success) {
    throw new Error("Error parsing routes");
  }

  const fieldsParsed = zodFields.safeParse(form.fields);
  if (!fieldsParsed.success) {
    throw new Error("Error parsing fields");
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

  logger.silly("Parsed Form Fields", parsedFields);

  const routes: z.infer<typeof zodRoutesView> = [];

  const existingFields: Record<string, true> = {};
  parsedFields?.forEach((f) => {
    existingFields[f.id] = true;
  });

  //TODO: Reuse type here
  const linkedToGlobalRouters: { name: string; description: string | null; id: string }[] = [];

  if (parsedRoutes) {
    for (let i = 0; i < parsedRoutes.length; i++) {
      const route = parsedRoutes[i];
      if (isRouter(route)) {
        const router = await prisma.app_RoutingForms_Form.findUnique({
          where: {
            //TODO: May be rename it to route.routerId
            id: route.id,
            //FIXME: Check user
          },
        });
        if (!router) {
          throw new Error("Global Router -" + route.id + " not found");
        }

        const parsedRouter = await getSerializableForm(prisma, router);

        linkedToGlobalRouters.push({
          name: parsedRouter.name,
          description: parsedRouter.description,
          id: parsedRouter.id,
        });

        routes.push({
          ...route,
          routerType: "global",
          name: parsedRouter.name,
          description: parsedRouter.description,
          //TODO: Remove non-null assertion
          routes: parsedRouter.routes!,
        });

        parsedRouter.fields?.forEach((field) => {
          // Deleted fields shouldn't be considered
          if (field.deleted) {
            return;
          }

          // Happens when the form is created and not saved.
          // Once the form is saved the link b/w Global Router field and Form is saved in the form, so that it can now be reordered
          if (!existingFields[field.id]) {
            const newField = {
              ...field,
              globalRouterId: parsedRouter.id,
            };
            fields.push({
              // Cache
              globalRouter: {
                id: parsedRouter.id,
                name: router.name,
                description: router.description || "",
              },
              ...newField,
            });

            logger.silly("Added  field from other Form:", newField);
          } else {
            const fieldView = fields.find((f) => f.id === field.id);
            if (!fieldView || !("globalRouterId" in fieldView)) {
              return;
            }
            fieldView.globalRouter = {
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
  }

  // Ideally we should't have needed to explicitly type it but due to some reason it's not working reliably with VSCode TypeCheck
  const serializableForm: SerializableForm<TForm> = {
    ...form,
    settings,
    fields,
    routes,
    linkedToGlobalRouters,
    createdAt: form.createdAt.toString(),
    updatedAt: form.updatedAt.toString(),
  };
  return serializableForm;
}
