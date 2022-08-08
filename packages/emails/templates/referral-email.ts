import { TFunction } from "next-i18next";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type TeamInvite = {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
};

export default class ReferralEmail extends BaseEmail {
  // teamInviteEvent: TeamInvite;

  constructor(refereeEmail, referrer) {
    super();
    // this.name = "SEND_TEAM_INVITE_EMAIL";
    // this.teamInviteEvent = teamInviteEvent;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: "testing@test.com",
      from: `Cal.com <${this.getMailerOptions().from}>`,
      subject: "This is a referral",
      html: renderEmail("ReferralEmail", {
        refereeEmail,
        referrer,
      }),
      text: "",
    };
  }
}
