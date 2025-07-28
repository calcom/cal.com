import type { App_RoutingForms_Form, App_RoutingForms_FormResponse } from "@prisma/client";

export interface RoutingFormResponseRepositoryInterface {
  findByIdIncludeForm(
    id: number
  ): Promise<(App_RoutingForms_FormResponse & { form: { fields: App_RoutingForms_Form["fields"] } }) | null>;

  findByBookingUidIncludeForm(
    bookingUid: string
  ): Promise<(App_RoutingForms_FormResponse & { form: { fields: App_RoutingForms_Form["fields"] } }) | null>;
}
