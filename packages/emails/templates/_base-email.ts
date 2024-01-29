import { decodeHTML } from "entities";
import { createTransport } from "nodemailer";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import { serverConfig } from "@calcom/lib/serverConfig";
import { setTestEmail } from "@calcom/lib/testEmails";
import prisma from "@calcom/prisma";

export default class BaseEmail {
  name = "";

  protected getTimezone() {
    return "";
  }

  protected getLocale(): string {
    return "";
  }

  protected getFormattedRecipientTime({ time, format }: { time: string; format: string }) {
    return dayjs(time).tz(this.getTimezone()).locale(this.getLocale()).format(format);
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {};
  }
  public async sendEmail() {
    const featureFlags = await getFeatureFlagMap(prisma);
    /** If email kill switch exists and is active, we prevent emails being sent. */
    if (featureFlags.emails) {
      console.warn("Skipped Sending Email due to active Kill Switch");
      return new Promise((r) => r("Skipped Sending Email due to active Kill Switch"));
    }

    if (process.env.INTEGRATION_TEST_MODE === "true") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      setTestEmail(await this.getNodeMailerPayload());
      console.log(
        "Skipped Sending Email as process.env.NEXT_PUBLIC_UNIT_TESTS is set. Emails are available in globalThis.testEmails"
      );
      return new Promise((r) => r("Skipped sendEmail for Unit Tests"));
    }

    const payload = await this.getNodeMailerPayload();
    const parseSubject = z.string().safeParse(payload?.subject);
    const payloadWithUnEscapedSubject = {
      headers: this.getMailerOptions().headers,
      ...payload,
      ...(parseSubject.success && { subject: decodeHTML(parseSubject.data) }),
    };
    await new Promise((resolve, reject) =>
      createTransport(this.getMailerOptions().transport).sendMail(
        payloadWithUnEscapedSubject,
        (_err, info) => {
          if (_err) {
            const err = getErrorFromUnknown(_err);
            this.printNodeMailerError(err);
            reject(err);
          } else {
            resolve(info);
          }
        }
      )
    ).catch((e) => console.error("sendEmail", e));
    return new Promise((resolve) => resolve("send mail async"));
  }
  protected getMailerOptions() {
    return {
      transport: serverConfig.transport,
      from: serverConfig.from,
      headers: serverConfig.headers,
    };
  }
  protected printNodeMailerError(error: Error): void {
    /** Don't clog the logs with unsent emails in E2E */
    if (process.env.NEXT_PUBLIC_IS_E2E) return;
    console.error(`${this.name}_ERROR`, error);
  }
}
