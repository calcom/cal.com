import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";

import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import BaseEmail from "./_base-email";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(toArray);

export default class WorkflowReminderEmail extends BaseEmail {
  sendTo: string;
  body: string;
  emailSubject: string;
  calEvent: CalendarEvent;

  constructor(calEvent: CalendarEvent, sendTo: string, emailSubject: string, body: string) {
    super();
    this.sendTo = sendTo;
    this.body = body;
    this.calEvent = calEvent;
    this.emailSubject = emailSubject;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `<${this.sendTo}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: this.emailSubject,
      text: this.body,
    };
  }

}
