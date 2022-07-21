import BaseEmail from "./_base-email";
import { BookingInfo } from "@calcom/web/ee/lib/workflows/reminders/smsReminderManager";
export default class WorkflowReminderEmail extends BaseEmail {
  sendTo: string;
  body: string;
  emailSubject: string;
  evt: BookingInfo;

  constructor(evt: BookingInfo, sendTo: string, emailSubject: string, body: string) {
    super();
    this.sendTo = sendTo;
    this.body = body;
    this.evt = evt;
    this.emailSubject = emailSubject;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    let from ="";
    let replyTo ="";

    if(this.evt.organizer) {
      from = this.evt.organizer.name || "";
      replyTo = this.evt.organizer.email;
    }
    return {
      to: `<${this.sendTo}>`,
      from: `${from} <${this.getMailerOptions().from}>`,
      replyTo: replyTo,
      subject: this.emailSubject,
      text: this.body,
    };
  }

}
