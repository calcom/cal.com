import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

export type OrganizationCreation = {
  language: TFunction;
  from: string;
  to: string;
  ownerNewUsername: string;
  ownerOldUsername: string | null;
  orgDomain: string;
  orgName: string;
  prevLink: string | null;
  newLink: string;
};

export default class OrganizationCreationEmail extends BaseEmail {
  organizationCreationEvent: OrganizationCreation;

  constructor(organizationCreationEvent: OrganizationCreation) {
    super();
    this.name = "SEND_ORGANIZATION_CREATION_EMAIL";
    this.organizationCreationEvent = organizationCreationEvent;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: this.organizationCreationEvent.to,
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      subject: this.organizationCreationEvent.language(`email_organization_created|subject`),
      html: await renderEmail("OrganizationCreationEmail", this.organizationCreationEvent),
      text: "",
    };
  }
}
