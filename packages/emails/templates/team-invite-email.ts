import type { TFunction } from "next-i18next";

import { APP_NAME, EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type TeamInvite = {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
  isCalcomMember: boolean;
  /**
   * We ideally should have a separate email for auto-join(when a user is automatically accepted into a team/org), but we don't have one yet.
   */
  isAutoJoin: boolean;
  isOrg: boolean;
  parentTeamName: string | undefined;
  isExistingUserMovedToOrg: boolean;
  prevLink: string | null;
  newLink: string | null;
};

export function getTypeOfInvite(teamInviteEvent: TeamInvite) {
  if (teamInviteEvent.isOrg) {
    return "TO_ORG";
  }

  if (teamInviteEvent.parentTeamName) {
    return "TO_SUBTEAM";
  }

  if (teamInviteEvent.isAutoJoin) {
    throw new Error("Auto-join is not supported for regular teams");
  }

  return "TO_REGULAR_TEAM";
}

export const getSubject = (teamInviteEvent: TeamInvite) => {
  const typeOfInvite = getTypeOfInvite(teamInviteEvent);
  const type = teamInviteEvent.isAutoJoin ? "added" : "invited";
  const variables = {
    user: teamInviteEvent.from,
    team: teamInviteEvent.teamName,
    appName: APP_NAME,
    parentTeamName: teamInviteEvent.parentTeamName,
    entity: teamInviteEvent.language(teamInviteEvent.isOrg ? "organization" : "team").toLowerCase(),
  };

  if (typeOfInvite === "TO_ORG") {
    return teamInviteEvent.language(`email_team_invite|subject|${type}_to_org`, variables);
  }

  if (typeOfInvite === "TO_SUBTEAM") {
    return teamInviteEvent.language(`email_team_invite|subject|${type}_to_subteam`, variables);
  }

  return teamInviteEvent.language(`email_team_invite|subject|${type}_to_regular_team`, variables);
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
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: getSubject(this.teamInviteEvent),
      html: await renderEmail("TeamInviteEmail", this.teamInviteEvent),
      text: "",
    };
  }
}
