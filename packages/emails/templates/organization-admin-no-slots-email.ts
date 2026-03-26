import { EMAIL_FROM_NAME } from "@calcom/lib/constants";
import type { TFunction } from "i18next";
import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type OrganizationAdminNoSlotsEmailInput = {
  language: TFunction;
  to: {
    email: string;
  };
  user: string;
  slug: string;
  startTime: string;
  endTime: string;
  teamSlug: string;
  editLink: string;
  rrHostSubsetIds?: number[];
};

export default class OrganizationAdminNoSlotsEmail extends BaseEmail {
  adminNoSlots: OrganizationAdminNoSlotsEmailInput;

  constructor(adminNoSlots: OrganizationAdminNoSlotsEmailInput) {
    super();
    this.name = "SEND_ORG_ADMIN_NO_SLOTS_EMAIL_EMAIL";
    this.adminNoSlots = adminNoSlots;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: this.adminNoSlots.to.email,
      subject: this.adminNoSlots.language("org_admin_no_slots|heading", { name: this.adminNoSlots.user }),
      html: await renderEmail("OrganizationAdminNoSlotsEmail", this.adminNoSlots),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const rrSubsetNotice =
      this.adminNoSlots.rrHostSubsetIds && this.adminNoSlots.rrHostSubsetIds.length > 0
        ? `\n${this.adminNoSlots.language("org_admin_no_slots|rr_subset_notice", {
            userIds: this.adminNoSlots.rrHostSubsetIds.join(", "),
          })}\n`
        : "";

    return `
Hi Admins,

It has been brought to our attention that ${this.adminNoSlots.user} has not had availability users have visited ${this.adminNoSlots.user}/${this.adminNoSlots.slug}.
${rrSubsetNotice}
There's a few reasons why this could be happening
* The user does not have any calendars connected
* Their schedules attached to this event are not enabled${this.adminNoSlots.rrHostSubsetIds?.length ? "\n* The round-robin host subset passed may be too restrictive" : ""}

We recommend checking their availability to resolve this
    `;
  }
}
