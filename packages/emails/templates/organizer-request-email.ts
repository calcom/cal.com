import { checkIfUserHasFeatureController } from "@calcom/features/flags/operations/check-if-user-has-feature.controller";
import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import { renderEmail } from "../";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

/**
 * TODO: Remove once fully migrated to V2
 */
async function getOrganizerRequestTemplate(userId?: number) {
  const hasNewTemplate = await checkIfUserHasFeatureController(userId, "organizer-request-email-v2");
  return hasNewTemplate ? ("OrganizerRequestEmailV2" as const) : ("OrganizerRequestEmail" as const);
}

export default class OrganizerRequestEmail extends OrganizerScheduledEmail {
  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const toAddresses = [this.teamMember?.email || this.calEvent.organizer.email];
    const template = await getOrganizerRequestTemplate(this.calEvent.organizer.id);

    return {
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      replyTo: [this.calEvent.organizer.email, ...this.calEvent.attendees.map(({ email }) => email)],
      subject: `${this.t("awaiting_approval")}: ${this.calEvent.title}`,
      html: await renderEmail(template, {
        calEvent: this.calEvent,
        attendee: this.calEvent.organizer,
      }),
      text: this.getTextBody("event_awaiting_approval"),
    };
  }

  protected getTextBody(title = "event_awaiting_approval"): string {
    return super.getTextBody(
      title,
      `${this.calEvent.organizer.language.translate("someone_requested_an_event")}`,
      "",
      `${this.calEvent.organizer.language.translate("confirm_or_reject_request")}
${process.env.NEXT_PUBLIC_WEBAPP_URL} + ${
        this.calEvent.recurringEvent?.count ? "/bookings/recurring" : "/bookings/upcoming"
      }`
    );
  }
}
