import type { TFunction } from "next-i18next";

import { APP_NAME } from "@calcom/lib/constants";

import { renderEmail } from "..";
import BaseEmail from "./_base-email";

export default class SlugReplacementEmail extends BaseEmail {
  email: string;
  name: string;
  teamName: string | null;
  slug: string;
  t: TFunction;

  constructor(email: string, name: string, teamName: string | null, slug: string, t: TFunction) {
    super();
    this.email = email;
    this.name = name;
    this.teamName = teamName;
    this.slug = slug;
    this.t = t;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      from: `${APP_NAME} <${this.getMailerOptions().from}>`,
      to: this.email,
      subject: this.t("email_subject_slug_replacement", { slug: this.slug }),
      html: await renderEmail("SlugReplacementEmail", {
        slug: this.slug,
        name: this.name,
        teamName: this.teamName || "",
        t: this.t,
      }),
      text: this.getTextBody(),
    };
  }

  protected getTextBody(): string {
    return `${this.t("email_body_slug_replacement_notice", { slug: this.slug })} ${this.t(
      "email_body_slug_replacement_suggestion"
    )}`;
  }
}
