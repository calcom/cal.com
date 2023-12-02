import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type TeamInvite = {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
  isCalcomMember: boolean;
  isOrg: boolean;
};

export default class TeamInviteEmail extends BaseEmail {
  teamInviteEvent: TeamInvite;

  constructor(teamInviteEvent: TeamInvite) {
    super();
    this.name = "SEND_TEAM_INVITE_EMAIL";
    this.teamInviteEvent = teamInviteEvent;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: this.teamInviteEvent.to,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      subject: this.teamInviteEvent.language("user_invited_you", {
        user: this.teamInviteEvent.from,
        team: this.teamInviteEvent.teamName,
        appName: APP_NAME,
        entity: this.teamInviteEvent
          .language(this.teamInviteEvent.isOrg ? "organization" : "team")
          .toLowerCase(),
      }),
      html: await renderEmail("TeamInviteEmail", this.teamInviteEvent),
      text: "",
    };
  }
}
