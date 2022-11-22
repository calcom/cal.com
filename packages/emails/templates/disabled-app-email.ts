import { TFunction, Trans } from "next-i18next";

import { getRichDescription } from "@calcom/lib/CalEventParser";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export default class DisabledAppEmail extends BaseEmail {
  email: string;
  appName: string;
  appType: string[];
  t: TFunction;
  title?: string;
  eventTypeId?: number;

  constructor(
    email: string,
    appName: string,
    appType: string[],
    t: TFunction,
    title?: string,
    eventTypeId?: number
  ) {
    super();
    this.email = email;
    this.title = title;
    this.appName = appName;
    this.eventTypeId = eventTypeId;
    this.appType = appType;
    this.t = t;
  }

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {
      from: `Cal.com <${this.getMailerOptions().from}>`,
      to: this.email,
      //   TODO add translation
      subject: `${this.t("admin_has_disabled", { appName: this.appName })} ${
        this.title && this.eventTypeId && this.t("this_affects_event_type", { eventType: this.title })
      }`,
      html: renderEmail("DisabledAppEmail", {
        title: this.title,
        appName: this.appName,
        eventTypeId: this.eventTypeId,
        appType: this.appType,
        t: this.t,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return this.appType.some((type) => type === "payment")
      ? this.t("disable_payment_app", { appName: this.appName, title: this.title })
      : this.t("app_disabled", { appName: this.appName });
  }
}
