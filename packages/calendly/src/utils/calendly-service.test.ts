import { NonRetriableError, RetryAfterError } from "inngest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CalendlyAPIService from "./calendly-service";

const createAxiosError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), {
    isAxiosError: true,
    response: { status },
  });

const createService = () =>
  new CalendlyAPIService({
    accessToken: "token",
    refreshToken: "refresh-token",
    clientSecret: "client-secret",
    clientID: "client-id",
    oauthUrl: "https://oauth.example.com",
    userId: 1,
    createdAt: Date.now(),
    expiresIn: 7200,
  });

const createStep = () => ({
  run: vi.fn(async (_title: string, fn: () => Promise<unknown>) => await fn()),
});

describe("CalendlyAPIService retry classification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("treats 504 responses as retriable in fetchDataWithRetry", async () => {
    const service = createService();
    vi.spyOn(service as any, "requestConfiguration").mockResolvedValue({});
    vi.spyOn((service as any).request, "get").mockRejectedValue(createAxiosError(504));

    const step = createStep();

    await expect(
      (service as any).fetchDataWithRetry({
        title: "Fetch Scheduled Events",
        url: "/scheduled_events",
        fnName: "getUserScheduledEvents",
        step,
      })
    ).rejects.toBeInstanceOf(RetryAfterError);
  });

  it("keeps 500 responses as non-retriable in fetchDataWithRetry", async () => {
    const service = createService();
    vi.spyOn(service as any, "requestConfiguration").mockResolvedValue({});
    vi.spyOn((service as any).request, "get").mockRejectedValue(createAxiosError(500));

    const step = createStep();

    await expect(
      (service as any).fetchDataWithRetry({
        title: "Fetch Scheduled Events",
        url: "/scheduled_events",
        fnName: "getUserScheduledEvents",
        step,
      })
    ).rejects.toBeInstanceOf(NonRetriableError);
  });
});
