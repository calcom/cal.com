import { renderEmail } from "@calcom/emails";
import BaseEmail from "@calcom/emails/templates/_base-email";

import { Response } from "../../types/types";
import { App_RoutingForms_Form } from ".prisma/client";

type Form = Pick<App_RoutingForms_Form, "id" | "name">;
export default class ResponseEmail extends BaseEmail {
  response: Response;
  toAddresses: string[];
  form: Form;
  constructor({ toAddresses, response, form }: { form: Form; toAddresses: string[]; response: Response }) {
    super();
    this.form = form;
    this.response = response;
    this.toAddresses = toAddresses;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = this.toAddresses;
    const subject = `${this.form.name} has a new response`;
    return {
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject,
      html: renderEmail("ResponseEmail", {
        form: this.form,
        response: this.response,
        subject,
      }),
    };
  }
}
