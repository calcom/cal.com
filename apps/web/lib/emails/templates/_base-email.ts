import nodemailer from "nodemailer";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import { serverConfig } from "@calcom/lib/serverConfig";

export default class BaseEmail {
  name = "";

  protected getNodeMailerPayload(): Record<string, unknown> {
    return {};
  }
  public sendEmail() {
    if (process.env.NEXT_PUBLIC_IS_E2E) return new Promise((r) => r("Skipped sendEmail for E2E"));
    new Promise((resolve, reject) =>
      nodemailer
        .createTransport(this.getMailerOptions().transport)
        .sendMail(this.getNodeMailerPayload(), (_err, info) => {
          if (_err) {
            const err = getErrorFromUnknown(_err);
            this.printNodeMailerError(err);
            reject(err);
          } else {
            resolve(info);
          }
        })
    ).catch((e) => console.error("sendEmail", e));
    return new Promise((resolve) => resolve("send mail async"));
  }

  protected getMailerOptions() {
    return {
      transport: serverConfig.transport,
      from: serverConfig.from,
    };
  }

  protected printNodeMailerError(error: Error): void {
    /** Don't clog the logs with unsent emails in E2E */
    if (process.env.NEXT_PUBLIC_IS_E2E) return;
    console.error(`${this.name}_ERROR`, error);
  }
}
