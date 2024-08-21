import { APP_NAME, EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import type { SmsLimitAlmostReachedData } from "../src/templates/SmsLimitAlmostReachedEmail";
import BaseEmail from "./_base-email";

export default class SmsLimitAlmostReachedEmail extends BaseEmail {
  team: SmsLimitAlmostReachedData;

  constructor(team: SmsLimitAlmostReachedData) {
    super();
    this.team = team;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.team.user.email,
      subject: this.team.user.t("sms_limit_almost_reached_subject", { appName: APP_NAME }),
      html: await renderEmail("SmsLimitAlmostReachedEmail", this.team),
      text: "",
    };
  }
}
