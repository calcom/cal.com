import { App_RoutingForms_Form } from "@prisma/client";

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

  // Ideally we shouldb't have needed to explicitly type it but due to some reason it's not working reliably with VSCode TypeCheck
  const serializableForm: SerializableForm<TForm> = {
    ...form,
    fields: fieldsParsed.data,
    routes: routesParsed.data,
    createdAt: form.createdAt.toString(),
    updatedAt: form.updatedAt.toString(),
  };
  return serializableForm;
}
