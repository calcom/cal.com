import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";
import { createEvent, DateArray } from "ics";
import { TFunction } from "next-i18next";
import rrule from "rrule";

import { getRichDescription } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { renderEmail } from "../";
import BaseEmail from "./_base-email";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(toArray);

export default class CustomEmail extends BaseEmail {
  sendTo: string;
  body: string;
  calEvent: CalendarEvent;

  constructor(calEvent: CalendarEvent, sendTo: string, body: string) {
    super();
    this.sendTo = sendTo;
    this.body = body;
    this.calEvent = calEvent;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      to: `Name <${this.sendTo}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `subject`,
      text: this.body,
    };
  }

}
