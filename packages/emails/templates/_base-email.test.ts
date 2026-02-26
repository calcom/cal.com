import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const {
  mockSendMail,
  mockCreateTransport,
  mockCheckIfFeatureIsEnabledGlobally,
  mockIsSmsCalEmail,
  mockGetConfigForOrg,
  mockSetTestEmail,
} = vi.hoisted(() => {
  const mockSendMail = vi.fn();
  return {
    mockSendMail,
    mockCreateTransport: vi.fn(() => ({ sendMail: mockSendMail })),
    mockIsSmsCalEmail: vi.fn(() => false),
    mockCheckIfFeatureIsEnabledGlobally: vi.fn().mockResolvedValue(false),
    mockGetConfigForOrg: vi.fn(),
    mockSetTestEmail: vi.fn(),
  };
});

vi.stubEnv("INTEGRATION_TEST_MODE", "false");

vi.mock("nodemailer", () => ({
  default: { createTransport: mockCreateTransport },
  createTransport: mockCreateTransport,
}));

vi.mock("@calcom/features/flags/features.repository", () => ({
  FeaturesRepository: class {
    checkIfFeatureIsEnabledGlobally = mockCheckIfFeatureIsEnabledGlobally;
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {},
}));

vi.mock("@calcom/lib/isSmsCalEmail", () => ({
  default: mockIsSmsCalEmail,
}));

vi.mock("@calcom/lib/serverConfig", () => ({
  serverConfig: {
    transport: { host: "default-smtp.cal.com", port: 587 },
    from: "Cal.com <noreply@cal.com>",
    headers: { "X-Cal-Header": "true" },
  },
}));

vi.mock("@calcom/features/di/smtpConfiguration/containers/smtpConfiguration", () => ({
  getSmtpConfigurationService: vi.fn(() => ({
    getConfigForOrg: mockGetConfigForOrg,
  })),
}));

vi.mock("@calcom/lib/testEmails", () => ({
  setTestEmail: mockSetTestEmail,
}));

vi.mock("@calcom/dayjs", () => {
  const mockDayjs: Record<string, unknown> = {};
  const chainable = () => mockDayjs;
  mockDayjs.tz = chainable;
  mockDayjs.locale = chainable;
  mockDayjs.format = vi.fn(() => "2024-01-01 10:00");
  return { default: vi.fn(() => mockDayjs) };
});

import BaseEmail from "./_base-email";

const ORG_SMTP_CONFIG = {
  smtpHost: "org-smtp.example.com",
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: "org-user",
  smtpPassword: "org-pass",
  fromEmail: "org@example.com",
  fromName: "Org Name",
};

class AttendeeScheduledEmail extends BaseEmail {
  name = "AttendeeScheduledEmail";

  constructor(
    orgId?: number | null,
    private payloadOverrides?: Record<string, unknown>
  ) {
    super();
    this.organizationId = orgId;
  }

  protected async getNodeMailerPayload() {
    return {
      from: "Cal.com <noreply@cal.com>",
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Test</p>",
      ...this.payloadOverrides,
    };
  }
}

class NonAllowlistedEmail extends BaseEmail {
  name = "SomeRandomEmail";

  constructor(orgId?: number | null) {
    super();
    this.organizationId = orgId;
  }

  protected async getNodeMailerPayload() {
    return {
      from: "Cal.com <noreply@cal.com>",
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Test</p>",
    };
  }
}

describe("BaseEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("INTEGRATION_TEST_MODE", "false");
    mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(false);
    mockIsSmsCalEmail.mockReturnValue(false);
    mockGetConfigForOrg.mockResolvedValue(null);
    mockSendMail.mockImplementation((_payload, cb) => cb(null, { messageId: "ok" }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ─── Kill Switch ──────────────────────────────────────────────

  describe("email kill switch", () => {
    it("skips sending when kill switch is enabled", async () => {
      mockCheckIfFeatureIsEnabledGlobally.mockResolvedValue(true);

      const email = new AttendeeScheduledEmail();
      const result = await email.sendEmail();

      expect(result).toBe("Skipped Sending Email due to active Kill Switch");
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it("proceeds when kill switch is disabled", async () => {
      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalled();
    });
  });

  // ─── Integration Test Mode ────────────────────────────────────

  describe("integration test mode", () => {
    beforeEach(() => {
      vi.stubEnv("INTEGRATION_TEST_MODE", "true");
    });

    it("captures test email and skips sending", async () => {
      const email = new AttendeeScheduledEmail();
      const result = await email.sendEmail();

      expect(result).toBe("Skipped sendEmail for Unit Tests");
      expect(mockSetTestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          from: "Cal.com <noreply@cal.com>",
          subject: "Test Subject",
          html: "<p>Test</p>",
        })
      );
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it("includes icalEvent in test email when present in payload", async () => {
      const icalData = { filename: "invite.ics", content: "BEGIN:VCALENDAR..." };
      const email = new AttendeeScheduledEmail(null, { icalEvent: icalData });
      await email.sendEmail();

      expect(mockSetTestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          icalEvent: icalData,
        })
      );
    });

    it("omits icalEvent from test email when not in payload", async () => {
      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      const capturedEmail = mockSetTestEmail.mock.calls[0][0];
      expect(capturedEmail.icalEvent).toBeUndefined();
    });

    it("returns default smtp config when email class is not allowlisted", async () => {
      const email = new NonAllowlistedEmail(1);
      await email.sendEmail();

      expect(mockSetTestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          smtpConfig: {
            host: "default",
            port: 0,
            fromEmail: "Cal.com <noreply@cal.com>",
            isCustomSmtp: false,
          },
        })
      );
    });

    it("returns default smtp config when no organizationId", async () => {
      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      expect(mockSetTestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          smtpConfig: {
            host: "default",
            port: 0,
            fromEmail: "Cal.com <noreply@cal.com>",
            isCustomSmtp: false,
          },
        })
      );
    });

    it("returns org smtp config when allowlisted with org id", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockSetTestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          smtpConfig: {
            host: "org-smtp.example.com",
            port: 465,
            fromEmail: "org@example.com",
            isCustomSmtp: true,
          },
        })
      );
    });

    it("returns default smtp config when org config fetch fails", async () => {
      mockGetConfigForOrg.mockRejectedValue(new Error("DB error"));

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockSetTestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          smtpConfig: {
            host: "default",
            port: 0,
            fromEmail: "Cal.com <noreply@cal.com>",
            isCustomSmtp: false,
          },
        })
      );
    });

    it("handles payload missing from/to/subject/html fields", async () => {
      const email = new AttendeeScheduledEmail(null, {
        from: undefined,
        to: undefined,
        subject: undefined,
        html: undefined,
      });

      Object.defineProperty(email, "getNodeMailerPayload", {
        value: async () => ({ customField: "value" }),
      });

      await email.sendEmail();

      expect(mockSetTestEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "",
          from: "",
          subject: "",
          html: "",
        })
      );
    });
  });

  // ─── SMS Email Skip ───────────────────────────────────────────

  describe("SMS email skip", () => {
    it("skips sending to SMS cal emails", async () => {
      mockIsSmsCalEmail.mockReturnValue(true);

      const email = new AttendeeScheduledEmail();
      const result = await email.sendEmail();

      expect(result).toContain("Skipped Sending Email to faux email");
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });

    it("passes the to address to isSmsCalEmail check", async () => {
      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      expect(mockIsSmsCalEmail).toHaveBeenCalledWith("user@example.com");
    });
  });

  // ─── Default SMTP (No Org) ────────────────────────────────────

  describe("default SMTP (no org config)", () => {
    it("sends with default transport and cal from address", async () => {
      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledTimes(1);
      expect(mockCreateTransport).toHaveBeenCalledWith({ host: "default-smtp.cal.com", port: 587 });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Cal.com <noreply@cal.com>",
          to: "user@example.com",
        }),
        expect.any(Function)
      );
    });

    it("includes headers from default options in payload", async () => {
      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { "X-Cal-Header": "true" },
        }),
        expect.any(Function)
      );
    });

    it("decodes HTML entities in subject", async () => {
      const email = new AttendeeScheduledEmail(null, { subject: "Hello &amp; World" });
      await email.sendEmail();

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "Hello & World",
        }),
        expect.any(Function)
      );
    });

    it("does not set subject when payload subject is not a string", async () => {
      const email = new AttendeeScheduledEmail(null, { subject: 12345 });
      await email.sendEmail();

      const sentPayload = mockSendMail.mock.calls[0][0];
      expect(sentPayload.subject).toBe(12345);
    });

    it("returns 'send mail async' on success", async () => {
      const email = new AttendeeScheduledEmail();
      const result = await email.sendEmail();

      expect(result).toBe("send mail async");
    });

    it("handles payload with empty from field", async () => {
      const email = new AttendeeScheduledEmail(null, { from: "" });
      await email.sendEmail();

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "" }),
        expect.any(Function)
      );
    });

    it("handles payload with no from field", async () => {
      const email = new AttendeeScheduledEmail();
      Object.defineProperty(email, "getNodeMailerPayload", {
        value: async () => ({ to: "user@example.com", subject: "Test", html: "<p>Test</p>" }),
      });
      await email.sendEmail();

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "" }),
        expect.any(Function)
      );
    });
  });

  // ─── Default SMTP Failure ─────────────────────────────────────

  describe("default SMTP failure (no org)", () => {
    it("does not retry when default SMTP fails", async () => {
      mockSendMail.mockImplementation((_payload, cb) => {
        cb(new Error("SMTP failed"), null);
      });

      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    it("still returns 'send mail async' even on failure", async () => {
      mockSendMail.mockImplementation((_payload, cb) => {
        cb(new Error("SMTP failed"), null);
      });

      const email = new AttendeeScheduledEmail();
      const result = await email.sendEmail();

      expect(result).toBe("send mail async");
    });
  });

  // ─── Org SMTP ─────────────────────────────────────────────────

  describe("org SMTP", () => {
    it("sends with org transport and org from (with fromName)", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledTimes(1);
      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: "org-smtp.example.com",
        port: 465,
        secure: true,
        auth: { user: "org-user", pass: "org-pass" },
      });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "Org Name <org@example.com>" }),
        expect.any(Function)
      );
    });

    it("uses just email as from when org has no fromName", async () => {
      mockGetConfigForOrg.mockResolvedValue({
        ...ORG_SMTP_CONFIG,
        fromName: "",
      });

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "org@example.com" }),
        expect.any(Function)
      );
    });

    it("uses just email as from when org fromName is null", async () => {
      mockGetConfigForOrg.mockResolvedValue({
        ...ORG_SMTP_CONFIG,
        fromName: null,
      });

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "org@example.com" }),
        expect.any(Function)
      );
    });

    it("does not use org SMTP for non-allowlisted email classes", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      const email = new NonAllowlistedEmail(1);
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledWith({ host: "default-smtp.cal.com", port: 587 });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "Cal.com <noreply@cal.com>" }),
        expect.any(Function)
      );
    });

    it("does not use org SMTP when organizationId is null", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      const email = new AttendeeScheduledEmail(null);
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledWith({ host: "default-smtp.cal.com", port: 587 });
      expect(mockGetConfigForOrg).not.toHaveBeenCalled();
    });

    it("does not use org SMTP when organizationId is undefined", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      const email = new AttendeeScheduledEmail(undefined);
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledWith({ host: "default-smtp.cal.com", port: 587 });
      expect(mockGetConfigForOrg).not.toHaveBeenCalled();
    });

    it("does not use org SMTP when organizationId is 0", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      const email = new AttendeeScheduledEmail(0);
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledWith({ host: "default-smtp.cal.com", port: 587 });
    });

    it("falls back to default when getOrgSmtpConfig returns null", async () => {
      mockGetConfigForOrg.mockResolvedValue(null);

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledWith({ host: "default-smtp.cal.com", port: 587 });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "Cal.com <noreply@cal.com>" }),
        expect.any(Function)
      );
    });

    it("falls back to default when SMTP config service throws", async () => {
      mockGetConfigForOrg.mockRejectedValue(new Error("Service unavailable"));

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledWith({ host: "default-smtp.cal.com", port: 587 });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "Cal.com <noreply@cal.com>" }),
        expect.any(Function)
      );
    });
  });

  // ─── Org SMTP Fallback ────────────────────────────────────────

  describe("org SMTP fallback to default", () => {
    it("retries with default transport and cal from when org SMTP fails", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      let callCount = 0;
      mockSendMail.mockImplementation((_payload, cb) => {
        callCount++;
        if (callCount === 1) {
          cb(new Error("Org SMTP connection refused"), null);
        } else {
          cb(null, { messageId: "fallback-ok" });
        }
      });

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledTimes(2);
      expect(mockCreateTransport).toHaveBeenNthCalledWith(1, {
        host: "org-smtp.example.com",
        port: 465,
        secure: true,
        auth: { user: "org-user", pass: "org-pass" },
      });
      expect(mockCreateTransport).toHaveBeenNthCalledWith(2, { host: "default-smtp.cal.com", port: 587 });

      expect(mockSendMail).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ from: "Org Name <org@example.com>" }),
        expect.any(Function)
      );
      expect(mockSendMail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ from: "Cal.com <noreply@cal.com>" }),
        expect.any(Function)
      );
    });

    it("uses cal from (not org from) on fallback even when org has no fromName", async () => {
      mockGetConfigForOrg.mockResolvedValue({ ...ORG_SMTP_CONFIG, fromName: "" });

      let callCount = 0;
      mockSendMail.mockImplementation((_payload, cb) => {
        callCount++;
        if (callCount === 1) {
          cb(new Error("Org SMTP failed"), null);
        } else {
          cb(null, { messageId: "fallback-ok" });
        }
      });

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockSendMail).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ from: "org@example.com" }),
        expect.any(Function)
      );
      expect(mockSendMail).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ from: "Cal.com <noreply@cal.com>" }),
        expect.any(Function)
      );
    });

    it("still returns 'send mail async' when both org and default SMTP fail", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      mockSendMail.mockImplementation((_payload, cb) => {
        cb(new Error("SMTP failed"), null);
      });

      const email = new AttendeeScheduledEmail(1);
      const result = await email.sendEmail();

      expect(mockCreateTransport).toHaveBeenCalledTimes(2);
      expect(result).toBe("send mail async");
    });

    it("attempts exactly 2 sends when org fails and default also fails", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      mockSendMail.mockImplementation((_payload, cb) => {
        cb(new Error("SMTP failed"), null);
      });

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      expect(mockSendMail).toHaveBeenCalledTimes(2);
    });
  });

  // ─── sanitizeDisplayName ──────────────────────────────────────

  describe("sanitizeDisplayName on from/to", () => {
    it("sanitizes special characters in from display name", async () => {
      const email = new AttendeeScheduledEmail(null, {
        from: 'Evil; "User" <evil@example.com>',
      });
      await email.sendEmail();

      const sentPayload = mockSendMail.mock.calls[0][0];
      expect(sentPayload.from).not.toContain(";");
      expect(sentPayload.from).not.toContain('"');
    });

    it("sanitizes special characters in to display name", async () => {
      const email = new AttendeeScheduledEmail(null, {
        to: 'Bad; (Name) <bad@example.com>',
      });
      await email.sendEmail();

      const sentPayload = mockSendMail.mock.calls[0][0];
      expect(sentPayload.to).not.toContain(";");
      expect(sentPayload.to).not.toContain("(");
      expect(sentPayload.to).not.toContain(")");
    });

    it("passes through plain email addresses unchanged", async () => {
      const email = new AttendeeScheduledEmail(null, {
        from: "plain@example.com",
        to: "recipient@example.com",
      });
      await email.sendEmail();

      const sentPayload = mockSendMail.mock.calls[0][0];
      expect(sentPayload.from).toBe("plain@example.com");
      expect(sentPayload.to).toBe("recipient@example.com");
    });
  });

  // ─── printNodeMailerError ─────────────────────────────────────

  describe("printNodeMailerError", () => {
    it("logs error to console when not in E2E mode", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSendMail.mockImplementation((_payload, cb) => {
        cb(new Error("SMTP down"), null);
      });

      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      expect(consoleSpy).toHaveBeenCalledWith(
        "AttendeeScheduledEmail_ERROR",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("suppresses error logging in E2E mode", async () => {
      vi.stubEnv("NEXT_PUBLIC_IS_E2E", "1");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSendMail.mockImplementation((_payload, cb) => {
        cb(new Error("SMTP down"), null);
      });

      const email = new AttendeeScheduledEmail();
      await email.sendEmail();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        "AttendeeScheduledEmail_ERROR",
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  // ─── getFormattedRecipientTime ────────────────────────────────

  describe("getFormattedRecipientTime", () => {
    it("returns formatted time string", () => {
      const email = new AttendeeScheduledEmail();
      const result = (email as unknown as { getFormattedRecipientTime: (opts: { time: string; format: string }) => string })
        .getFormattedRecipientTime({ time: "2024-01-01T10:00:00Z", format: "YYYY-MM-DD HH:mm" });

      expect(result).toBe("2024-01-01 10:00");
    });
  });

  // ─── getMailerOptions ─────────────────────────────────────────

  describe("getMailerOptions", () => {
    it("returns server config values", () => {
      const email = new AttendeeScheduledEmail();
      const options = (email as unknown as { getMailerOptions: () => Record<string, unknown> }).getMailerOptions();

      expect(options).toEqual({
        transport: { host: "default-smtp.cal.com", port: 587 },
        from: "Cal.com <noreply@cal.com>",
        headers: { "X-Cal-Header": "true" },
      });
    });
  });

  // ─── Payload Merging ──────────────────────────────────────────

  describe("payload construction", () => {
    it("overrides payload from/to with sanitized values", async () => {
      const email = new AttendeeScheduledEmail(null, {
        from: "Original Sender <original@cal.com>",
        to: "Original Recipient <original@example.com>",
      });
      await email.sendEmail();

      const sentPayload = mockSendMail.mock.calls[0][0];
      expect(sentPayload.from).toBe("Original Sender <original@cal.com>");
      expect(sentPayload.to).toBe("Original Recipient <original@example.com>");
    });

    it("preserves extra payload fields alongside from/to/subject", async () => {
      const email = new AttendeeScheduledEmail(null, {
        replyTo: "reply@example.com",
        cc: "cc@example.com",
      });
      await email.sendEmail();

      const sentPayload = mockSendMail.mock.calls[0][0];
      expect(sentPayload.replyTo).toBe("reply@example.com");
      expect(sentPayload.cc).toBe("cc@example.com");
    });

    it("includes headers from default options even with org SMTP", async () => {
      mockGetConfigForOrg.mockResolvedValue(ORG_SMTP_CONFIG);

      const email = new AttendeeScheduledEmail(1);
      await email.sendEmail();

      const sentPayload = mockSendMail.mock.calls[0][0];
      expect(sentPayload.headers).toEqual({ "X-Cal-Header": "true" });
    });
  });
});
