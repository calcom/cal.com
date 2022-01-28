import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import timezone from "dayjs/plugin/timezone";
import toArray from "dayjs/plugin/toArray";
import utc from "dayjs/plugin/utc";

import { getCancelLink } from "@lib/CalEventParser";

import {
  emailHead,
  emailSchedulingBodyHeader,
  emailBodyLogo,
  emailScheduledBodyHeaderContent,
  emailSchedulingBodyDivider,
} from "./common";
import OrganizerScheduledEmail from "./organizer-scheduled-email";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);
dayjs.extend(toArray);

export default class OrganizerRescheduledEmail extends OrganizerScheduledEmail {
  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.calEvent.organizer.email];
    if (this.calEvent.team) {
      this.calEvent.team.members.forEach((member) => {
        const memberAttendee = this.calEvent.attendees.find((attendee) => attendee.name === member);
        if (memberAttendee) {
          toAddresses.push(memberAttendee.email);
        }
      });
    }

    return {
      icalEvent: {
        filename: "event.ics",
        content: this.getiCalEventAsString(),
      },
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      subject: `${this.calEvent.organizer.language.translate("rescheduled_event_type_subject", {
        eventType: this.calEvent.type,
        name: this.calEvent.attendees[0].name,
        date: `${this.getOrganizerStart().format("h:mma")} - ${this.getOrganizerEnd().format(
          "h:mma"
        )}, ${this.calEvent.organizer.language.translate(
          this.getOrganizerStart().format("dddd").toLowerCase()
        )}, ${this.calEvent.organizer.language.translate(
          this.getOrganizerStart().format("MMMM").toLowerCase()
        )} ${this.getOrganizerStart().format("D")}, ${this.getOrganizerStart().format("YYYY")}`,
      })}`,
      html: this.getHtmlBody(),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `
${this.calEvent.organizer.language.translate("event_has_been_rescheduled")}
${this.calEvent.organizer.language.translate("emailed_you_and_any_other_attendees")}
${this.getWhat()}
${this.getWhen()}
${this.getLocation()}
${this.getAdditionalNotes()}
${this.calEvent.organizer.language.translate("need_to_reschedule_or_cancel")}
${getCancelLink(this.calEvent)}
`.replace(/(<([^>]+)>)/gi, "");
  }

  protected getHtmlBody(): string {
    const headerContent = this.calEvent.organizer.language.translate("rescheduled_event_type_subject", {
      eventType: this.calEvent.type,
      name: this.calEvent.attendees[0].name,
      date: `${this.getOrganizerStart().format("h:mma")} - ${this.getOrganizerEnd().format(
        "h:mma"
      )}, ${this.calEvent.organizer.language.translate(
        this.getOrganizerStart().format("dddd").toLowerCase()
      )}, ${this.calEvent.organizer.language.translate(
        this.getOrganizerStart().format("MMMM").toLowerCase()
      )} ${this.getOrganizerStart().format("D")}, ${this.getOrganizerStart().format("YYYY")}`,
    });

    return `
    <!doctype html>
    <html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
    ${emailHead(headerContent)}
    <body style="word-spacing:normal;background-color:#F5F5F5;">
      <div style="background-color:#F5F5F5;">
        ${emailSchedulingBodyHeader("calendarCircle")}
        ${emailScheduledBodyHeaderContent(
          this.calEvent.organizer.language.translate("event_has_been_rescheduled"),
          this.calEvent.organizer.language.translate("emailed_you_and_any_other_attendees")
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
                              ${this.getAdditionalNotes()}
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
}
