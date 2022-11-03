import { App_RoutingForms_Form } from "@prisma/client";

import { RoutingFormSettings } from "@calcom/prisma/zod-utils";

import { SerializableForm } from "../types/types";
import { zodFields, zodRoutes } from "../zod";

export function getSerializableForm<TForm extends App_RoutingForms_Form>(form: TForm) {
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

  // Ideally we shouldb't have needed to explicitly type it but due to some reason it's not working reliably with VSCode TypeCheck
  const serializableForm: SerializableForm<TForm> = {
    ...form,
    settings: settings,
    fields: fieldsParsed.data,
    routes: routesParsed.data,
    createdAt: form.createdAt.toString(),
    updatedAt: form.updatedAt.toString(),
  };
  return serializableForm;
}
