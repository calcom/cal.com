import { describe, expect, it } from "vitest";
import getNewWebhookUrl from "./getNewWebhookUrl";

describe("getNewWebhookUrl", () => {
  it("should return base URL without params when no arguments provided", () => {
    expect(getNewWebhookUrl()).toBe("webhooks/new");
  });

  it("should include teamId query param when teamId provided", () => {
    expect(getNewWebhookUrl(123)).toBe("webhooks/new?teamId=123");
  });

  it("should include platform query param when platform is true", () => {
    expect(getNewWebhookUrl(undefined, true)).toBe("webhooks/new?platform=true");
  });

  it("should prefer platform over teamId when both provided", () => {
    expect(getNewWebhookUrl(123, true)).toBe("webhooks/new?platform=true");
  });
});
