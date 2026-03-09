/** biome-ignore-all lint/suspicious/noTsIgnore: test file */
import { loggerConfig } from "@/lib/logger";

describe("loggerConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- test needs to replace process.env with a plain object
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should include vercel metadata when VERCEL env var is set", () => {
    process.env.VERCEL = "1";
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- VERCEL_ENV is readonly in ProcessEnv
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_REGION = "iad1";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_abc123";

    const config = loggerConfig();
    const meta = config.defaultMeta as Record<string, unknown>;

    expect(meta.vercel).toEqual({
      environment: "production",
      region: "iad1",
      deploymentId: "dpl_abc123",
    });
  });

  it("should not include git metadata", () => {
    process.env.VERCEL = "1";
    process.env.VERCEL_GIT_COMMIT_SHA = "abc123def456";
    process.env.VERCEL_GIT_REPO_SLUG = "cal";
    process.env.VERCEL_GIT_COMMIT_REF = "main";

    const config = loggerConfig();
    const meta = config.defaultMeta as Record<string, unknown>;

    expect(meta.git).toBeUndefined();
  });

  it("should set vercel to undefined when VERCEL env var is not set", () => {
    delete process.env.VERCEL;

    const config = loggerConfig();
    const meta = config.defaultMeta as Record<string, unknown>;

    expect(meta.vercel).toBeUndefined();
  });

  it("should always include service name", () => {
    const config = loggerConfig();
    const meta = config.defaultMeta as Record<string, unknown>;

    expect(meta.service).toBe("cal-platform-api");
  });
});
