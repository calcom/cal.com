import { App_RoutingForms_Form, App_RoutingForms_Router } from "@prisma/client";

import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

import { SerializableForm, SerializableRouter } from "../types/types";
import { zodFields, zodRoutes } from "../zod";

/**
 * Doesn't have deleted fields by default
 */
export async function getSerializableForm<TForm extends App_RoutingForms_Form>(
  prisma,
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
  let updatedFields = parsedFields;
  type Route =
    | NonNullable<typeof routesParsed.data>[number]
    | (Omit<NonNullable<typeof routesParsed.data>[number], "isFallback" | "queryValue" | "action"> & {
        routerType: "global";
        routes: NonNullable<typeof routesParsed.data>;
      });
  const updatedRoutes: Route[] = [];
  const existingFields = {};
  parsedFields?.forEach((f) => {
    existingFields[f.id] = true;
  });

  const globalRouterFieldsMap = {};
  if (routes) {
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i];
      if (route.routerType === "global") {
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

        updatedRoutes.push({
          ...route,
          routerType: "global",
          name: router.name,
          description: router.description,
          routes: zodRoutes.parse(router.routes),
        });
        router.fields.forEach((field) => {
          if (!existingFields[field.id]) {
            // Happens when the form is created and not saved.
            // Once the form is saved the link b/w Global Router field and Form is saved in the form, so that it can now be reordered
            console.log("Adding field", field);

            updatedFields.push({ globalRouterId: form.id, id: field.id });
            globalRouterFieldsMap[field.id] = field;
          } else {
            globalRouterFieldsMap[field.id] = field;
          }
        });
      } else {
        updatedRoutes.push(route);
      }
    }
  }

  updatedFields = updatedFields.map((field) => {
    console.log("field.globalRouterId", field.globalRouterId, "globalRouterFieldsMap", globalRouterFieldsMap);
    if (field.globalRouterId) {
      return globalRouterFieldsMap[field.id];
    }
    return field;
  });

  // Ideally we shouldb't have needed to explicitly type it but due to some reason it's not working reliably with VSCode TypeCheck
  const serializableForm: SerializableForm<TForm> = {
    ...form,
    settings: settings,
    fields: updatedFields,
    routes: updatedRoutes,
    createdAt: form.createdAt.toString(),
    updatedAt: form.updatedAt.toString(),
  };
  return serializableForm;
}

/**
 * Doesn't have deleted fields by default
 */
export async function getSerializableRouter<TRouter extends App_RoutingForms_Router>(
  form: TRouter,
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
  // const settings = RoutingFormSettings.parse(
  //   form.settings || {
  //     // Would have really loved to do it using zod. But adding .default(true) throws type error in prisma/zod/app_routingforms_form.ts
  //     emailOwnerOnSubmission: true,
  //   }
  // );

  const routes = routesParsed.data;

  // Ideally we shouldb't have needed to explicitly type it but due to some reason it's not working reliably with VSCode TypeCheck
  const serializableRouter: SerializableRouter<TRouter> = {
    ...form,
    // settings: settings,
    fields: fieldsParsed.data
      ? withDeletedFields
        ? fieldsParsed.data
        : fieldsParsed.data.filter((f) => !f.deleted)
      : [],
    routes,
    createdAt: form.createdAt.toString(),
    updatedAt: form.updatedAt.toString(),
  };
  return serializableRouter;
}
