import { TFunction, Trans } from "next-i18next";

import { getRichDescription } from "@calcom/lib/CalEventParser";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export default class BrokenIntegrationEmail extends BaseEmail {
  title: string;
  emails: string;
  appName: string;
  eventTypeId: number;
  t: TFunction;

  constructor(title: string, emails: string, appName: string, eventTypeId: number) {
    super();
    this.emails = emails;
    this.title = title;
    this.appName = appName;
    this.eventTypeId = eventTypeId;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    const toAddresses = [this.emails];

    return {
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: toAddresses.join(","),
      //   TODO add translation
      subject: `Admin has disabled ${this.appName} which affects ${this.title}`,
      html: renderEmail("DisabledPaymentEmail", {
        title: this.title,
        appName: this.appName,
        eventTypeId: this.eventTypeId,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `The admin has disabled ${this.appName} which affects your event type ${this.title}.
    Attendees are still able to book this type of event but will not be prompted to pay. You may hide
    hide the event type to prevent this until your admin renables your payment method.
    `;
  }
}
