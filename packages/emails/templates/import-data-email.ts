import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import type { ImportDataEmailProps } from "../src/templates/ImportDataEmail";
import BaseEmail from "./_base-email";

export default class ImportDataEmail extends BaseEmail {
  importData: ImportDataEmailProps;

  constructor(importData: ImportDataEmailProps) {
    super();
    this.importData = importData;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: this.importData.user.email,
      subject: `${APP_NAME}: Data import status`,
      html: await renderEmail("ImportDataEmail", this.importData),
      text: "",
    };
  }
}
