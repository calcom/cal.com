import { App_RoutingForms_Form } from "@prisma/client";
import { z } from "zod";

import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

import { SerializableForm } from "../types/types";
import { zodFields, zodRoutes, zodRoutesView, zodFieldsView } from "../zod";
import getConnectedForms from "./getConnectedForms";
import isRouter from "./isRouter";
import isRouterLinkedField from "./isRouterLinkedField";

/**
 * Doesn't have deleted fields by default
 */
export async function getSerializableForm<TForm extends App_RoutingForms_Form>(
  form: TForm,
  withDeletedFields = false
) {
  const prisma = (await import("@calcom/prisma")).default;
  const routesParsed = zodRoutes.safeParse(form.routes);
  if (!routesParsed.success) {
    throw new Error("Error parsing routes");
  }

  const fieldsParsed = zodFields.safeParse(form.fields);

  if (!fieldsParsed.success) {
    throw new Error("Error parsing fields" + fieldsParsed.error);
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

  const routes: z.infer<typeof zodRoutesView> = [];

  const fieldsExistInForm: Record<string, true> = {};
  parsedFields?.forEach((f) => {
    fieldsExistInForm[f.id] = true;
  });

  //TODO: Reuse type here
  const routers: { name: string; description: string | null; id: string }[] = [];
  if (parsedRoutes) {
    for (let i = 0; i < parsedRoutes.length; i++) {
      const route = parsedRoutes[i];
      if (isRouter(route)) {
        // A form(as router) can only be used once in a form.
        // TODO: Prevent this from happening in the select box itself and mutation
        const router = await prisma.app_RoutingForms_Form.findFirst({
          where: {
            id: route.id,
            userId: form.userId,
          },
        });
        if (!router) {
          throw new Error("Form -" + route.id + ", being used as router, not found");
        }

        const parsedRouter = await getSerializableForm(router);

        routers.push({
          name: parsedRouter.name,
          description: parsedRouter.description,
          id: parsedRouter.id,
        });

        routes.push({
          ...route,
          isRouter: true,
          name: parsedRouter.name,
          description: parsedRouter.description,
          routes: parsedRouter.routes || [],
        });

        parsedRouter.fields?.forEach((field) => {
          // Happens when the form is created and not saved.
          // Once the form is saved the link b/w router field and Form is saved in the form, so that it can now be reordered
          if (!fieldsExistInForm[field.id]) {
            throw new Error("This case should never happen. Remove the code");
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
  }

  const connectedForms = (await getConnectedForms(prisma, form)).map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description,
  }));
  // const finalFields = fields.map((f) => (f.routerField ? f.routerField : f));
  const finalFields = fields;

  // Ideally we should't have needed to explicitly type it but due to some reason it's not working reliably with VSCode TypeCheck
  const serializableForm: SerializableForm<TForm> = {
    ...form,
    settings,
    fields: finalFields,
    routes,
    routers,
    connectedForms,
    createdAt: form.createdAt.toString(),
    updatedAt: form.updatedAt.toString(),
  };
  return serializableForm;
}
