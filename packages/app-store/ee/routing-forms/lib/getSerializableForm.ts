import { App_RoutingForms_Form } from "@prisma/client";
import { z } from "zod";

import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

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
  const routes = routesParsed.data;

  const updatedFields = parsedFields as NonNullable<z.infer<typeof zodFieldsView>>;

  console.log("Form Fields", parsedFields);

  const updatedRoutes: z.infer<typeof zodRoutesView> = [];

  const existingFields: Record<string, true> = {};
  parsedFields?.forEach((f) => {
    existingFields[f.id] = true;
  });

  //TODO: Reuse type here
  const linkedToGlobalRouters: { name: string; description: string | null; id: string }[] = [];

  // const globalRouterFieldsMap = {};
  if (routes) {
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      if ("routerType" in route) {
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

        updatedRoutes.push({
          ...route,
          routerType: "global",
          name: parsedRouter.name,
          description: parsedRouter.description,
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
            updatedFields.push({
              // Cache
              globalRouter: {
                id: parsedRouter.id,
                name: router.name,
                description: router.description || "",
              },
              ...newField,
            });

            // globalRouterFieldsMap[field.id] = newField;
            console.log("Added field", newField);
          } else {
            updatedFields.find((f) => f.id === field.id)!.globalRouter = {
              id: parsedRouter.id,
              name: router.name,
              description: router.description || "",
            };
          }
        });
      } else {
        updatedRoutes.push(route);
      }
    }
  }

  // Ideally we should't have needed to explicitly type it but due to some reason it's not working reliably with VSCode TypeCheck
  const serializableForm: SerializableForm<TForm> = {
    ...form,
    settings: settings,
    fields: updatedFields,
    routes: updatedRoutes,
    linkedToGlobalRouters,
    createdAt: form.createdAt.toString(),
    updatedAt: form.updatedAt.toString(),
  };
  return serializableForm;
}
