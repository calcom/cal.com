import type { TFunction } from "next-i18next";

import { getRichDescription } from "@calcom/lib/CalEventParser";
import { APP_NAME } from "@calcom/lib/constants";
import type { User } from "@calcom/prisma/client";
import type { CalendarEvent } from "@calcom/types/Calendar";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export default class OrganizerDailyDigestEmail extends BaseEmail {
  user: User;
  calEvents: CalendarEvent[];
  t: TFunction;

  constructor(input: { user: User; t: TFunction; calEvents: CalendarEvent[] }) {
    super();
    this.name = "SEND_DAILY_DIGEST";
    this.user = input.user;
    this.calEvents = input.calEvents;
    this.t = input.t;
  }
  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: this.user.email,
      subject: this.t("daily_digest_email_subject", {
        count: this.calEvents.length,
      }),
      html: renderEmail("OrganizerDailyDigestEmail", {
        user: this.user,
        calEvents: this.calEvents,
        t: this.t,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    const upcomingMeetingLines = this.calEvents
      .map((calEvent) => `-\t${getRichDescription(calEvent)}`)
      .join("\n");

    const callToAction = "";

    return `
${this.t("daily_digest_email_title")}
${this.t("daily_digest_email_subtitle")}
${upcomingMeetingLines}
${callToAction}
`.trim();
  }
}
