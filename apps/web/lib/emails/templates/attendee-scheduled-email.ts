import dayjs, { Dayjs } from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";
import { createEvent, DateArray } from "ics";
import rrule from "rrule";

import { getAppName } from "@calcom/app-store/utils";
import { getCancelLink, getRichDescription } from "@calcom/lib/CalEventParser";
import type { CalendarEvent, Person, RecurringEvent } from "@calcom/types/Calendar";

import BaseEmail from "@lib/emails/templates/_base-email";

import {
  emailBodyLogo,
  emailHead,
  emailScheduledBodyHeaderContent,
  emailSchedulingBodyDivider,
  emailSchedulingBodyHeader,
  linkIcon,
} from "./common";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(toArray);

export default class AttendeeScheduledEmail extends BaseEmail {
  calEvent: CalendarEvent;
  attendee: Person;
  recurringEvent: RecurringEvent;

  constructor(calEvent: CalendarEvent, attendee: Person, recurringEvent: RecurringEvent) {
    super();
    this.name = "SEND_BOOKING_CONFIRMATION";
    this.calEvent = calEvent;
    this.attendee = attendee;
    this.recurringEvent = recurringEvent;
  }

  protected getiCalEventAsString(): string | undefined {
    // Taking care of recurrence rule beforehand
    let recurrenceRule: string | undefined = undefined;
    if (this.recurringEvent?.count) {
      recurrenceRule = new rrule(this.recurringEvent).toString().replace("RRULE:", "");
    }
    const icsEvent = createEvent({
      start: dayjs(this.calEvent.startTime)
        .utc()
        .toArray()
        .slice(0, 6)
        .map((v, i) => (i === 1 ? v + 1 : v)) as DateArray,
      startInputType: "utc",
      productId: "calendso/ics",
      title: this.calEvent.attendees[0].language.translate("ics_event_title", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
      }),
      description: this.getTextBody(),
      duration: { minutes: dayjs(this.calEvent.endTime).diff(dayjs(this.calEvent.startTime), "minute") },
      organizer: { name: this.calEvent.organizer.name, email: this.calEvent.organizer.email },
      attendees: this.calEvent.attendees.map((attendee: Person) => ({
        name: attendee.name,
        email: attendee.email,
      })),
      ...{ recurrenceRule },
      status: "CONFIRMED",
    });
    if (icsEvent.error) {
      throw icsEvent.error;
    }
    return icsEvent.value;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      to: `${this.attendee.name} <${this.attendee.email}>`,
      from: `${this.calEvent.organizer.name} <${this.getMailerOptions().from}>`,
      replyTo: this.calEvent.organizer.email,
      subject: `${this.calEvent.attendees[0].language.translate("confirmed_event_type_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.team?.name || this.calEvent.organizer.name,
        date: `${this.getInviteeStart().format("h:mma")} - ${this.getInviteeEnd().format(
          "h:mma"
        )}, ${this.calEvent.attendees[0].language.translate(
          this.getInviteeStart().format("dddd").toLowerCase()
        )}, ${this.calEvent.attendees[0].language.translate(
          this.getInviteeStart().format("MMMM").toLowerCase()
        )} ${this.getInviteeStart().format("D")}, ${this.getInviteeStart().format("YYYY")}`,
      })}`,
      html: this.getHtmlBody(),
      text: this.getTextBody(),
    };
  }

  protected getDescription(): string {
    if (!this.calEvent.description) return "";
    return `
    <p style="height: 6px"></p>
    <div style="line-height: 6px;">
      <p style="color: #494949;">${this.calEvent.organizer.language.translate("description")}</p>
      <p style="color: #494949; font-weight: 400; line-height: 24px; white-space: pre-wrap;">${
        this.calEvent.description
      }</p>
    </div>
    `;
  }
  protected getTextBody(): string {
    return `
${this.calEvent.attendees[0].language.translate(
  this.recurringEvent?.count ? "your_event_has_been_scheduled_recurring" : "your_event_has_been_scheduled"
)}
${this.calEvent.attendees[0].language.translate("emailed_you_and_any_other_attendees")}

${getRichDescription(this.calEvent)}
`.trim();
  }

  protected getHtmlBody(): string {
    const headerContent = this.calEvent.attendees[0].language.translate("confirmed_event_type_subject", {
      eventType: this.calEvent.type,
      name: this.calEvent.team?.name || this.calEvent.organizer.name,
      date: `${this.getInviteeStart().format("h:mma")} - ${this.getInviteeEnd().format(
        "h:mma"
      )}, ${this.calEvent.attendees[0].language.translate(
        this.getInviteeStart().format("dddd").toLowerCase()
      )}, ${this.calEvent.attendees[0].language.translate(
        this.getInviteeStart().format("MMMM").toLowerCase()
      )} ${this.getInviteeStart().format("D")}, ${this.getInviteeStart().format("YYYY")}`,
    });

    return `
    <!doctype html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    ${emailHead(headerContent)}
    <body style="word-spacing:normal;background-color:#F5F5F5;">
      <div style="background-color:#F5F5F5;">
        ${emailSchedulingBodyHeader("checkCircle")}
        ${emailScheduledBodyHeaderContent(
          this.calEvent.attendees[0].language.translate(
            this.recurringEvent?.count
              ? "your_event_has_been_scheduled_recurring"
              : "your_event_has_been_scheduled"
          ),
          this.calEvent.attendees[0].language.translate("emailed_you_and_any_other_attendees")
        )}
        ${emailSchedulingBodyDivider()}
        <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="border-left:1px solid #E1E1E1;border-right:1px solid #E1E1E1;direction:ltr;font-size:0px;padding:0px;text-align:center;">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:598px;" ><![endif]-->
                  <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                      <tbody>
                        <tr>
                          <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                            <div style="font-family:Roboto, Helvetica, sans-serif;font-size:16px;font-weight:500;line-height:1;text-align:left;color:#3E3E3E;">
                              ${this.getWhat()}
                              ${this.getWhen()}
                              ${this.getWho()}
                              ${this.getLocation()}
                              ${this.getDescription()}
                              ${this.getAdditionalNotes()}
                              ${this.getCustomInputs()}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        ${emailSchedulingBodyDivider()}
        <!--[if mso | IE]></td></tr></table><table align="center" border="0" cellpadding="0" cellspacing="0" class="" style="width:600px;" width="600" bgcolor="#FFFFFF" ><tr><td style="line-height:0px;font-size:0px;mso-line-height-rule:exactly;"><![endif]-->
        <div style="background:#FFFFFF;background-color:#FFFFFF;margin:0px auto;max-width:600px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF;background-color:#FFFFFF;width:100%;">
            <tbody>
              <tr>
                <td style="border-bottom:1px solid #E1E1E1;border-left:1px solid #E1E1E1;border-right:1px solid #E1E1E1;direction:ltr;font-size:0px;padding:0px;text-align:center;">
                  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td class="" style="vertical-align:top;width:598px;" ><![endif]-->
                  <div class="mj-column-per-100 mj-outlook-group-fix" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%;">
                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top;" width="100%">
                      <tbody>
                        <tr>
                          <td align="left" style="font-size:0px;padding:10px 25px;word-break:break-word;">
                            <div style="font-family:Roboto, Helvetica, sans-serif;font-size:16px;font-weight:500;line-height:0px;text-align:left;color:#3E3E3E;">
                              ${this.getManageLink()}
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <!--[if mso | IE]></td></tr></table><![endif]-->
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        ${emailBodyLogo()}
        <!--[if mso | IE]></td></tr></table><![endif]-->
      </div>
    </body>
    </html>
    `;
  }

  protected getManageLink(): string {
    // Only the original attendee can make changes to the event
    // Guests cannot
    if (this.attendee === this.calEvent.attendees[0]) {
      const manageText = this.calEvent.attendees[0].language.translate("manage_this_event");
      return `<p>${this.calEvent.attendees[0].language.translate(
        "need_to_reschedule_or_cancel"
      )}</p><p style="font-weight: 400; line-height: 24px;"><a href="${getCancelLink(
        this.calEvent
      )}" style="color: #3E3E3E;" alt="${manageText}">${manageText}</a></p>`;
    }

    return "";
  }

  protected getWhat(): string {
    return `
    <div style="line-height: 6px;">
      <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("what")}</p>
      <p style="color: #494949; font-weight: 400; line-height: 24px;">${this.calEvent.type}</p>
    </div>`;
  }

  protected getRecurringWhen(): string {
    if (this.recurringEvent?.freq) {
      return ` - ${this.calEvent.attendees[0].language.translate("every_for_freq", {
        freq: this.calEvent.attendees[0].language.translate(
          `${rrule.FREQUENCIES[this.recurringEvent.freq].toString().toLowerCase()}`
        ),
      })} ${this.recurringEvent.count} ${this.calEvent.attendees[0].language.translate(
        `${rrule.FREQUENCIES[this.recurringEvent.freq].toString().toLowerCase()}`,
        { count: this.recurringEvent.count }
      )}`;
    } else {
      return "";
    }
  }

  protected getWhen(): string {
    return `
    <p style="height: 6px"></p>
    <div style="line-height: 6px;">
      <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("when")}${
      this.recurringEvent?.count ? this.getRecurringWhen() : ""
    }</p>
      <p style="color: #494949; font-weight: 400; line-height: 24px;">
      ${this.recurringEvent?.count ? `${this.calEvent.attendees[0].language.translate("starting")} ` : ""}
      ${this.calEvent.attendees[0].language.translate(
        this.getInviteeStart().format("dddd").toLowerCase()
      )}, ${this.calEvent.attendees[0].language.translate(
      this.getInviteeStart().format("MMMM").toLowerCase()
    )} ${this.getInviteeStart().format("D")}, ${this.getInviteeStart().format(
      "YYYY"
    )} | ${this.getInviteeStart().format("h:mma")} - ${this.getInviteeEnd().format(
      "h:mma"
    )} <span style="color: #888888">(${this.getTimezone()})</span>
      </p>
    </div>`;
  }

  protected getWho(): string {
    const attendees = this.calEvent.attendees
      .map((attendee) => {
        return `<div style="color: #494949; font-weight: 400; line-height: 24px;">${
          attendee?.name || `${this.calEvent.attendees[0].language.translate("guest")}`
        } <span style="color: #888888"><a href="mailto:${attendee.email}" style="color: #888888;">${
          attendee.email
        }</a></span></div>`;
      })
      .join("");

    const organizer = `<div style="color: #494949; font-weight: 400; line-height: 24px;">${
      this.calEvent.organizer.name
    } - ${this.calEvent.attendees[0].language.translate(
      "organizer"
    )} <span style="color: #888888"><a href="mailto:${
      this.calEvent.organizer.email
    }" style="color: #888888;">${this.calEvent.organizer.email}</a></span></div>`;

    return `
    <p style="height: 6px"></p>
    <div style="line-height: 6px;">
      <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("who")}</p>
      ${organizer + attendees}
    </div>`;
  }

  protected getAdditionalNotes(): string {
    if (!this.calEvent.additionalNotes) return "";
    return `
    <p style="height: 6px"></p>
    <div style="line-height: 6px;">
      <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("additional_notes")}</p>
      <p style="color: #494949; font-weight: 400; line-height: 24px; white-space: pre-wrap;">${
        this.calEvent.additionalNotes
      }</p>
    </div>
    `;
  }

  protected getCustomInputs(): string {
    const { customInputs } = this.calEvent;
    if (!customInputs) return "";
    const customInputsString = Object.keys(customInputs)
      .map((key) => {
        if (customInputs[key] !== "") {
          return `
          <p style="height: 6px"></p>
          <div style="line-height: 6px;">
            <p style="color: #494949;">${key}</p>
            <p style="color: #494949; font-weight: 400;">
              ${customInputs[key]}
            </p>
          </div>
        `;
        }
      })
      .join("");

    return customInputsString;
  }

  protected getRejectionReason(): string {
    if (!this.calEvent.rejectionReason) return "";
    return `
    <p style="height: 6px"></p>
    <div style="line-height: 6px;">
      <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("rejection_reason")}</p>
      <p style="color: #494949; font-weight: 400; line-height: 24px;">${this.calEvent.rejectionReason}</p>
    </div>`;
  }

  protected getLocation(): string {
    let providerName = this.calEvent.location && getAppName(this.calEvent.location);

    if (this.calEvent.location && this.calEvent.location.includes("integrations:")) {
      const location = this.calEvent.location.split(":")[1];
      providerName = location[0].toUpperCase() + location.slice(1);
    }

    // If location its a url, probably we should be validating it with a custom library
    if (this.calEvent.location && /^https?:\/\//.test(this.calEvent.location)) {
      providerName = this.calEvent.location;
    }

    if (this.calEvent.videoCallData) {
      const meetingId = this.calEvent.videoCallData.id;
      const meetingPassword = this.calEvent.videoCallData.password;
      const meetingUrl = this.calEvent.videoCallData.url;

      return `
      <p style="height: 6px"></p>
      <div style="line-height: 6px;">
        <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("where")}</p>
        <p style="color: #494949; font-weight: 400; line-height: 24px;">${providerName} ${
        meetingUrl &&
        `<a href="${meetingUrl}" target="_blank" alt="${this.calEvent.attendees[0].language.translate(
          "meeting_url"
        )}"><img src="${linkIcon()}" width="12px"></img></a>`
      }</p>
        ${
          meetingId &&
          `<div style="color: #494949; font-weight: 400; line-height: 24px;">${this.calEvent.attendees[0].language.translate(
            "meeting_id"
          )}: <span>${meetingId}</span></div>`
        }
        ${
          meetingPassword &&
          `<div style="color: #494949; font-weight: 400; line-height: 24px;">${this.calEvent.attendees[0].language.translate(
            "meeting_password"
          )}: <span>${meetingPassword}</span></div>`
        }
        ${
          meetingUrl &&
          `<div style="color: #494949; font-weight: 400; line-height: 24px;">${this.calEvent.attendees[0].language.translate(
            "meeting_url"
          )}: <a href="${meetingUrl}" alt="${this.calEvent.attendees[0].language.translate(
            "meeting_url"
          )}" style="color: #3E3E3E" target="_blank">${meetingUrl}</a></div>`
        }
      </div>
      `;
    }

    if (this.calEvent.additionInformation?.hangoutLink) {
      const hangoutLink: string = this.calEvent.additionInformation.hangoutLink;

      return `
      <p style="height: 6px"></p>
      <div style="line-height: 6px;">
        <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("where")}</p>
        <p style="color: #494949; font-weight: 400; line-height: 24px;">${providerName} ${
        hangoutLink &&
        `<a href="${hangoutLink}" target="_blank" alt="${this.calEvent.attendees[0].language.translate(
          "meeting_url"
        )}"><img src="${linkIcon()}" width="12px"></img></a>`
      }</p>
        <div style="color: #494949; font-weight: 400; line-height: 24px;"><a href="${hangoutLink}" alt="${this.calEvent.attendees[0].language.translate(
        "meeting_url"
      )}" style="color: #3E3E3E" target="_blank">${hangoutLink}</a></div>
      </div>
      `;
    }

    return `
    <p style="height: 6px"></p>
    <div style="line-height: 6px;">
      <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("where")}</p>
      <p style="color: #494949; font-weight: 400; line-height: 24px;">${
        providerName || this.calEvent.location
      }</p>
      ${
        providerName === "Zoom" || providerName === "Google"
          ? `<p style="color: #494949; font-weight: 400; line-height: 24px;">
              ${this.calEvent.organizer.language.translate("meeting_url_provided_after_confirmed")}
              </p>`
          : ``
      }
    </div>
    `;
  }

  protected getTimezone(): string {
    // Timezone is based on the first attendee in the attendee list
    // as the first attendee is the one who created the booking
    return this.calEvent.attendees[0].timeZone;
  }

  protected getInviteeStart(): Dayjs {
    return dayjs(this.calEvent.startTime).tz(this.getTimezone());
  }

  protected getInviteeEnd(): Dayjs {
    return dayjs(this.calEvent.endTime).tz(this.getTimezone());
  }

  protected getReason(): string {
    return `
    <div style="line-height: 6px; margin-bottom: 24px;">
      <p style="color: #494949;">${this.calEvent.attendees[0].language.translate("reschedule_reason")}</p>
      <p style="color: #494949; font-weight: 400; line-height: 24px;">${this.calEvent.cancellationReason}</p>
    </div>`;
  }
}
