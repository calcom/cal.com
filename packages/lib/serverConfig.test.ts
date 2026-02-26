import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/env", () => ({
  isENVDev: false,
}));

vi.mock("./getAdditionalEmailHeaders", () => ({
  getAdditionalEmailHeaders: () => ({
    "smtp.sendgrid.net": { "X-SMTPAPI": '{"filters":{}}' },
  }),
}));

describe("serverConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("uses Resend transport when RESEND_API_KEY is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "");

    const mod = await import("./serverConfig");
    const transport = mod.serverConfig.transport as Record<string, unknown>;
    expect(transport.host).toBe("smtp.resend.com");
    expect(transport.port).toBe(465);
    expect(transport.secure).toBe(true);
    expect((transport.auth as Record<string, string>).user).toBe("resend");
    expect((transport.auth as Record<string, string>).pass).toBe("re_test_key");
  });

  it("uses EMAIL_SERVER string when set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER", "smtp://user:pass@mail.example.com:587");
    vi.stubEnv("EMAIL_SERVER_HOST", "");

    const mod = await import("./serverConfig");
    expect(mod.serverConfig.transport).toBe("smtp://user:pass@mail.example.com:587");
  });

  it("uses EMAIL_SERVER_HOST config when set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_SERVER_PORT", "587");
    vi.stubEnv("EMAIL_SERVER_USER", "myuser");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "mypass");

    const mod = await import("./serverConfig");
    const transport = mod.serverConfig.transport as Record<string, unknown>;
    expect(transport.host).toBe("smtp.example.com");
    expect(transport.port).toBe(587);
    expect((transport.auth as Record<string, string>).user).toBe("myuser");
    expect((transport.auth as Record<string, string>).pass).toBe("mypass");
    expect(transport.secure).toBe(false);
  });

  it("sets secure to true when port is 465", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_SERVER_PORT", "465");
    vi.stubEnv("EMAIL_SERVER_USER", "u");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "p");

    const mod = await import("./serverConfig");
    const transport = mod.serverConfig.transport as Record<string, unknown>;
    expect(transport.secure).toBe(true);
  });

  it("omits auth when user and password are not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "smtp.example.com");
    vi.stubEnv("EMAIL_SERVER_PORT", "25");
    vi.stubEnv("EMAIL_SERVER_USER", "");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "");

    const mod = await import("./serverConfig");
    const transport = mod.serverConfig.transport as Record<string, unknown>;
    expect(transport.auth).toBeUndefined();
  });

  it("falls back to sendmail transport when nothing is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "");

    const mod = await import("./serverConfig");
    const transport = mod.serverConfig.transport as Record<string, unknown>;
    expect(transport.sendmail).toBe(true);
    expect(transport.newline).toBe("unix");
    expect(transport.path).toBe("/usr/sbin/sendmail");
  });

  it("sets EMAIL_FROM from environment", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "");
    vi.stubEnv("EMAIL_FROM", "noreply@cal.com");

    const mod = await import("./serverConfig");
    expect(mod.serverConfig.from).toBe("noreply@cal.com");
  });

  it("sets headers when EMAIL_SERVER_HOST matches known host", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "smtp.sendgrid.net");
    vi.stubEnv("EMAIL_SERVER_PORT", "587");
    vi.stubEnv("EMAIL_SERVER_USER", "");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "");

    const mod = await import("./serverConfig");
    expect(mod.serverConfig.headers).toBeDefined();
  });

  it("sets headers to undefined when host does not match", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_SERVER", "");
    vi.stubEnv("EMAIL_SERVER_HOST", "smtp.unknown.com");
    vi.stubEnv("EMAIL_SERVER_PORT", "587");
    vi.stubEnv("EMAIL_SERVER_USER", "");
    vi.stubEnv("EMAIL_SERVER_PASSWORD", "");

    const mod = await import("./serverConfig");
    expect(mod.serverConfig.headers).toBeUndefined();
  });
});
