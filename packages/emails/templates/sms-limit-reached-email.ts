import { APP_NAME, EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import type { SmsLimitReachedData } from "../src/templates/SmsLimitReachedEmail";
import BaseEmail from "./_base-email";

export default class SmsLimitAlmostReachedEmail extends BaseEmail {
  team: SmsLimitReachedData;

  constructor(team: SmsLimitReachedData) {
    super();
    this.team = team;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.team.user.email,
      subject: this.team.user.t("sms_limit_reached_subject", { appName: APP_NAME }),
      html: await renderEmail("SmsLimitReachedEmail", this.team),
      text: "",
    };
  }
}
