import type { App_RoutingForms_Form, App_RoutingForms_FormResponse } from "@calcom/prisma/client";

export interface RoutingFormResponseRepositoryInterface {
  findByIdIncludeForm(
    id: number
  ): Promise<{
    response: App_RoutingForms_FormResponse["response"];
    form: Pick<App_RoutingForms_Form, "fields" | "name" | "description" | "userId" | "teamId">;
  } | null>;

  findByBookingUidIncludeForm(
    bookingUid: string
  ): Promise<(App_RoutingForms_FormResponse & { form: { fields: App_RoutingForms_Form["fields"] } }) | null>;
}
