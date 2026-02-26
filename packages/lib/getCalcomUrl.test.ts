import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./constants", () => ({
  WEBAPP_URL: "https://app.cal.com",
  IS_CALCOM: true,
}));

describe("getCalcomUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns "https://cal.com" when IS_CALCOM and hostname ends with cal.com', async () => {
    vi.doMock("./constants", () => ({
      WEBAPP_URL: "https://app.cal.com",
      IS_CALCOM: true,
    }));
    const { getCalcomUrl } = await import("./getCalcomUrl");
    expect(getCalcomUrl()).toBe("https://cal.com");
  });

  it('returns "https://cal.eu" when IS_CALCOM and hostname ends with cal.eu', async () => {
    vi.doMock("./constants", () => ({
      WEBAPP_URL: "https://app.cal.eu",
      IS_CALCOM: true,
    }));
    const { getCalcomUrl } = await import("./getCalcomUrl");
    expect(getCalcomUrl()).toBe("https://cal.eu");
  });

  it("returns WEBAPP_URL when IS_CALCOM is false", async () => {
    vi.doMock("./constants", () => ({
      WEBAPP_URL: "https://my-selfhosted.example.com",
      IS_CALCOM: false,
    }));
    const { getCalcomUrl } = await import("./getCalcomUrl");
    expect(getCalcomUrl()).toBe("https://my-selfhosted.example.com");
  });

  it("returns WEBAPP_URL for self-hosted instances", async () => {
    vi.doMock("./constants", () => ({
      WEBAPP_URL: "https://calendar.company.org",
      IS_CALCOM: false,
    }));
    const { getCalcomUrl } = await import("./getCalcomUrl");
    expect(getCalcomUrl()).toBe("https://calendar.company.org");
  });

  it("handles WEBAPP_URL with subdomain on cal.com", async () => {
    vi.doMock("./constants", () => ({
      WEBAPP_URL: "https://staging.cal.com",
      IS_CALCOM: true,
    }));
    const { getCalcomUrl } = await import("./getCalcomUrl");
    expect(getCalcomUrl()).toBe("https://cal.com");
  });

  it("handles WEBAPP_URL with subdomain on cal.eu", async () => {
    vi.doMock("./constants", () => ({
      WEBAPP_URL: "https://staging.cal.eu",
      IS_CALCOM: true,
    }));
    const { getCalcomUrl } = await import("./getCalcomUrl");
    expect(getCalcomUrl()).toBe("https://cal.eu");
  });
});
