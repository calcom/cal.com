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

  it("should include vercel and git metadata when VERCEL env var is set", () => {
    process.env.VERCEL = "1";
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- VERCEL_ENV is readonly in ProcessEnv
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_REGION = "iad1";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_abc123";
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- VERCEL_URL is readonly in ProcessEnv
    process.env.VERCEL_URL = "my-app-abc123.vercel.app";
    process.env.VERCEL_GIT_COMMIT_SHA = "abc123def456";
    process.env.VERCEL_GIT_REPO_SLUG = "cal";
    process.env.VERCEL_GIT_COMMIT_REF = "main";

    const config = loggerConfig();
    const meta = config.defaultMeta as Record<string, unknown>;

    expect(meta.vercel).toEqual({
      environment: "production",
      region: "iad1",
      deploymentId: "dpl_abc123",
      deploymentUrl: "my-app-abc123.vercel.app",
    });
    expect(meta.git).toEqual({
      commit: "abc123def456",
      repo: "cal",
      ref: "main",
    });
  });

  it("should set vercel and git to undefined when VERCEL env var is not set", () => {
    delete process.env.VERCEL;

    const config = loggerConfig();
    const meta = config.defaultMeta as Record<string, unknown>;

    expect(meta.vercel).toBeUndefined();
    expect(meta.git).toBeUndefined();
  });

  it("should always include service name", () => {
    const config = loggerConfig();
    const meta = config.defaultMeta as Record<string, unknown>;

    expect(meta.service).toBe("cal-platform-api");
  });
});
