import process from "node:process";
import dayjs from "@calcom/dayjs";
import { getSmtpConfigurationService } from "@calcom/features/di/smtpConfiguration/containers/smtpConfiguration";
import type { SmtpEmailConfig } from "@calcom/features/ee/organizations/lib/service/SmtpConfigurationService";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import logger from "@calcom/lib/logger";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { serverConfig } from "@calcom/lib/serverConfig";
import type { TestEmail, TestEmailSmtpConfig } from "@calcom/lib/testEmails";
import { setTestEmail } from "@calcom/lib/testEmails";
import { prisma } from "@calcom/prisma";
import { decodeHTML } from "entities";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";
import { CUSTOM_SMTP_ALLOWED_EMAILS } from "../lib/custom-smtp-allowlist";
import { sanitizeDisplayName } from "../lib/sanitizeDisplayName";

const log = logger.getSubLogger({ prefix: ["BaseEmail"] });

export default class BaseEmail {
  name = "";
  protected organizationId?: number | null;

  private canUseCustomSmtp(): boolean {
    const className = this.constructor.name;
    console.log("canUseCustomSmtp", {
      className,
      organizationId: this.organizationId,
      inAllowedList: (CUSTOM_SMTP_ALLOWED_EMAILS as readonly string[]).includes(className),
    });
    return (CUSTOM_SMTP_ALLOWED_EMAILS as readonly string[]).includes(className) && !!this.organizationId;
  }

  private async getOrgSmtpConfig(): Promise<SmtpEmailConfig | null> {
    if (!this.organizationId || !this.canUseCustomSmtp()) return null;

    try {
      const service = getSmtpConfigurationService();
      return await service.getActiveConfigForOrg(this.organizationId);
    } catch (error) {
      log.warn("Failed to fetch org SMTP config, falling back to default", {
        organizationId: this.organizationId,
        error,
      });
      return null;
    }
  }

  private buildOrgTransport(config: SmtpEmailConfig): SMTPTransport.Options {
    return {
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    };
  }

  private async getTestSmtpConfig(): Promise<TestEmailSmtpConfig> {
    const defaultOptions = this.getMailerOptions();
    const defaultConfig: TestEmailSmtpConfig = {
      host: "default",
      port: 0,
      fromEmail: defaultOptions.from ?? "",
      isCustomSmtp: false,
    };

    if (!this.canUseCustomSmtp()) {
      return defaultConfig;
    }

    const orgConfig = await this.getOrgSmtpConfig();
    if (!orgConfig) {
      return defaultConfig;
    }

    return {
      host: orgConfig.smtpHost,
      port: orgConfig.smtpPort,
      fromEmail: orgConfig.fromEmail,
      isCustomSmtp: true,
    };
  }

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
    const featuresRepository = new FeaturesRepository(prisma);
    const emailsDisabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("emails");
    /** If email kill switch exists and is active, we prevent emails being sent. */
    if (emailsDisabled) {
      console.warn("Skipped Sending Email due to active Kill Switch");
      return new Promise((r) => r("Skipped Sending Email due to active Kill Switch"));
    }

    const payload = await this.getNodeMailerPayload();

    if (process.env.INTEGRATION_TEST_MODE === "true") {
      const smtpConfig = await this.getTestSmtpConfig();
      const testEmail: TestEmail = {
        to: "to" in payload ? String(payload.to) : "",
        from: "from" in payload ? (payload.from as string | { email: string; name: string }) : "",
        subject: "subject" in payload ? String(payload.subject) : "",
        html: "html" in payload ? String(payload.html) : "",
        smtpConfig,
      };
      if (payload.icalEvent) {
        testEmail.icalEvent = payload.icalEvent as { filename: string; content: string };
      }
      setTestEmail(testEmail);
      console.log(
        "Skipped Sending Email as process.env.NEXT_PUBLIC_UNIT_TESTS is set. Emails are available in globalThis.testEmails"
      );
      return new Promise((r) => r("Skipped sendEmail for Unit Tests"));
    }

    let from = "from" in payload ? (payload.from as string) : "";
    const to = "to" in payload ? (payload.to as string) : "";

    if (isSmsCalEmail(to)) {
      console.log(`Skipped Sending Email to faux email: ${to}`);
      return new Promise((r) => r(`Skipped Sending Email to faux email: ${to}`));
    }


    const parseSubject = z.string().safeParse(payload?.subject);

    const defaultOptions = this.getMailerOptions();
    let transport = defaultOptions.transport;
    let usingOrgSmtp = false;

    const orgConfig = await this.getOrgSmtpConfig();
    if (orgConfig) {
      transport = this.buildOrgTransport(orgConfig);
      from =
        orgConfig.fromName
          ? `${orgConfig.fromName} <${orgConfig.fromEmail}>`
          : orgConfig.fromEmail
      usingOrgSmtp = true;
      log.info("Using custom SMTP config", {
        organizationId: this.organizationId,
        emailClass: this.constructor.name,
      });
    }

    const sanitizedFrom = sanitizeDisplayName(from);
    const sanitizedTo = sanitizeDisplayName(to);

    const { createTransport } = await import("nodemailer");

    const sendWithTransport = (transportConfig: typeof transport, fromAddress: string): Promise<unknown> => {
      const finalPayload = {
        headers: defaultOptions.headers,
        ...payload,
        from: fromAddress,
        to: sanitizedTo,
        ...(parseSubject.success && { subject: decodeHTML(parseSubject.data) }),
      };

      return new Promise((resolve, reject) =>
        createTransport(transportConfig).sendMail(finalPayload, (_err, info) => {
          if (_err) {
            const err = getServerErrorFromUnknown(_err);
            this.printNodeMailerError(err);
            reject(err);
          } else {
            resolve(info);
          }
        })
      );
    };

    try {
      await sendWithTransport(transport, sanitizedFrom);
    } catch (orgSmtpError) {
      if (usingOrgSmtp) {
        log.warn("Org SMTP failed, retrying with default SMTP", {
          organizationId: this.organizationId,
          emailClass: this.constructor.name,
          error: orgSmtpError,
        });
        try {
          await sendWithTransport(defaultOptions.transport, sanitizedFrom);
          log.info("Successfully sent email using default SMTP after org SMTP failure", {
            organizationId: this.organizationId,
            emailClass: this.constructor.name,
          });
        } catch (defaultSmtpError) {
          log.error("sendEmail failed with both org and default SMTP", {
            organizationId: this.organizationId,
            emailClass: this.constructor.name,
          });
        }
      } else {
        log.error("sendEmail failed", {
          emailClass: this.constructor.name,
        });
      }
    }

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
