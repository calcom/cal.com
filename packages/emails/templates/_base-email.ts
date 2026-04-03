import process from "node:process";
import dayjs from "@calcom/dayjs";
import { getFeatureRepository } from "@calcom/features/di/containers/FeatureRepository";
import { getTeamFeatureRepository } from "@calcom/features/di/containers/TeamFeatureRepository";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import logger from "@calcom/lib/logger";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { serverConfig } from "@calcom/lib/serverConfig";
import type { TestEmail, TestEmailSmtpConfig } from "@calcom/lib/testEmails";
import { setTestEmail } from "@calcom/lib/testEmails";
import { decodeHTML } from "entities";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";
import { CUSTOM_SMTP_ALLOWED_EMAILS } from "../lib/custom-smtp-allowlist";
import { sanitizeDisplayName } from "../lib/sanitizeDisplayName";

const log = logger.getSubLogger({ prefix: ["BaseEmail"] });

const testEmailPayloadSchema = z.object({
  to: z.string(),
  from: z.union([z.string(), z.object({ email: z.string(), name: z.string() })]),
  subject: z.string(),
  html: z.string(),
  icalEvent: z.object({ filename: z.string(), content: z.string() }).optional(),
});

interface SmtpEmailConfig {
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpSecure: boolean;
}

export default class BaseEmail {
  name = "";
  protected organizationId?: number | null;

  private async canUseCustomSmtp(): Promise<boolean> {
    const className = this.name;
    if (!(CUSTOM_SMTP_ALLOWED_EMAILS as readonly string[]).includes(className) || !this.organizationId) {
      return false;
    }

    const teamFeatureRepository = getTeamFeatureRepository();
    return teamFeatureRepository.checkIfTeamHasFeature(this.organizationId, "custom-smtp-for-orgs");
  }

  protected async resolveSmtpConfig(): Promise<SmtpEmailConfig | null> {
    if (!this.organizationId) return null;

    const { getSmtpConfigurationService } = await import(
      "@calcom/features/di/smtp-configuration/containers/smtp-configuration"
    );
    const service = getSmtpConfigurationService();
    return service.getDecryptedConfigForOrg(this.organizationId);
  }

  private async getOrgSmtpConfig(): Promise<SmtpEmailConfig | null> {
    const canUseCustomSmtp = await this.canUseCustomSmtp();
    if (!canUseCustomSmtp) return null;

    try {
      return await this.resolveSmtpConfig();
    } catch (error) {
      log.warn("Failed to resolve org SMTP config, falling back to default", {
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
    const featuresRepository = getFeatureRepository();
    const emailsDisabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("emails");
    /** If email kill switch exists and is active, we prevent emails being sent. */
    if (emailsDisabled) {
      console.warn("Skipped Sending Email due to active Kill Switch");
      return new Promise((r) => r("Skipped Sending Email due to active Kill Switch"));
    }

    const payload = await this.getNodeMailerPayload();

    if (process.env.INTEGRATION_TEST_MODE === "true") {
      const smtpConfig = await this.getTestSmtpConfig();
      const parsed = testEmailPayloadSchema.safeParse(payload);
      const testEmail: TestEmail = parsed.success
        ? { ...parsed.data, smtpConfig }
        : {
            to: "to" in payload ? String(payload.to) : "",
            from: "from" in payload ? String(payload.from) : "",
            subject: "subject" in payload ? String(payload.subject) : "",
            html: "html" in payload ? String(payload.html) : "",
            smtpConfig,
          };
      setTestEmail(testEmail);
      console.log(
        "Skipped Sending Email as process.env.NEXT_PUBLIC_UNIT_TESTS is set. Emails are available in globalThis.testEmails"
      );
      return new Promise((r) => r("Skipped sendEmail for Unit Tests"));
    }

    let from = "from" in payload ? (payload.from as string) : "";
    const calFrom = from;
    const sanitizedCalFrom = sanitizeDisplayName(calFrom);
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
      from = orgConfig.fromName ? `${orgConfig.fromName} <${orgConfig.fromEmail}>` : orgConfig.fromEmail;
      usingOrgSmtp = true;
      log.info("Using custom SMTP config", {
        organizationId: this.organizationId,
        emailClass: this.name,
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
          emailClass: this.name,
          error: orgSmtpError,
        });
        try {
          await sendWithTransport(defaultOptions.transport, sanitizedCalFrom);
          log.info("Successfully sent email using default SMTP after org SMTP failure", {
            organizationId: this.organizationId,
            emailClass: this.name,
          });
        } catch (defaultSmtpError) {
          log.error("sendEmail failed with both org and default SMTP", {
            organizationId: this.organizationId,
            error: defaultSmtpError,
            emailClass: this.name,
          });
        }
      } else {
        log.error("sendEmail failed", {
          error: orgSmtpError,
          emailClass: this.name,
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
