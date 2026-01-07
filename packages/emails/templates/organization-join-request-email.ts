import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME, WEBAPP_URL } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type OrganizationJoinRequestEmailInput = {
  language: TFunction;
  to: {
    email: string;
  };
  userFullName: string;
  userEmail: string;
  orgName: string;
  orgId: number;
};

export default class OrganizationJoinRequestEmail extends BaseEmail {
  input: OrganizationJoinRequestEmailInput;

  constructor(input: OrganizationJoinRequestEmailInput) {
    super();
    this.name = "SEND_ORG_JOIN_REQUEST_EMAIL";
    this.input = input;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.input.to.email,
      subject: this.input.language("org_join_request_email_subject", { orgName: this.input.orgName }),
      html: await renderEmail("OrganizationJoinRequestEmail", this.input),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const manageMembersLink = `${WEBAPP_URL}/settings/organizations/members`;
    return `
User ${this.input.userFullName} (${this.input.userEmail}) requested to join the organization.

Was this a mistake? Manage all members here: ${manageMembersLink}
    `.trim();
  }
}
