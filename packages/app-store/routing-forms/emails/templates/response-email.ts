import renderEmail from "@calcom/emails/src/renderEmail";
import BaseEmail from "@calcom/emails/templates/_base-email";
import type { App_RoutingForms_Form } from "@calcom/prisma/client";

import type { OrderedResponses } from "../../types/types";

type Form = Pick<App_RoutingForms_Form, "id" | "name" | "fields">;
export default class ResponseEmail extends BaseEmail {
  orderedResponses: OrderedResponses;
  toAddresses: string[];
  form: Form;
  constructor({
    toAddresses,
    orderedResponses,
    form,
  }: {
    form: Form;
    toAddresses: string[];
    orderedResponses: OrderedResponses;
  }) {
    super();
    this.form = form;
    this.orderedResponses = orderedResponses;
    this.toAddresses = toAddresses;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = this.toAddresses;
    const subject = `${this.form.name} has a new response`;
    return {
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject,
      html: await renderEmail("ResponseEmail", {
        form: this.form,
        orderedResponses: this.orderedResponses,
        subject,
      }),
    };
  }
}
