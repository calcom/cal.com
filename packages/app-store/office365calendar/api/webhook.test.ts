import type { NextApiRequest, NextApiResponse } from "next";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { getCredentialForCalendarCache } from "@calcom/lib/delegationCredential/server";
import { SelectedCalendarRepository } from "@calcom/lib/server/repository/selectedCalendar";

import { getCalendar } from "../../_utils/getCalendar";
import postHandler from "./webhook";

vi.mock("@calcom/lib/server/repository/selectedCalendar");
vi.mock("@calcom/lib/delegationCredential/server");
vi.mock("../../_utils/getCalendar");

describe("Office365CalendarWebhook - postHandler", () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let mockSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = {
      method: "POST",
      query: {},
      body: {},
    };
    mockSend = vi.fn();
    res = {
      setHeader: vi.fn(),
      send: mockSend,
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    process.env.MICROSOFT_WEBHOOK_TOKEN = "test-webhook-token";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should handle validation token request", async () => {
    req.query = { validationToken: "test-token" };

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/plain");
    expect(mockSend).toHaveBeenCalledWith("test-token");
  });

  it("should throw HttpError for invalid payload", async () => {
    req.body = { value: "not-an-array" };

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid webhook payload",
      })
    );
  });

  it("should handle empty notification payload", async () => {
    req.body = { value: [] };

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.json).toHaveBeenCalledWith({
      message: "ok",
      processed: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    });
  });

  it("should skip notifications with invalid clientState", async () => {
    req.body = {
      value: [
        {
          subscriptionId: "sub1",
          clientState: "invalid-token",
          resource: "me/calendars/cal1/events/event1",
          changeType: "created",
        },
      ],
    };

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.json).toHaveBeenCalledWith({
      message: "ok",
      processed: 0,
      failed: 0,
      skipped: 1,
      errors: ["Invalid or missing clientState for subscription sub1"],
    });
  });

  it("should handle duplicate subscriptionIds", async () => {
    req.body = {
      value: [
        {
          subscriptionId: "sub1",
          clientState: "test-webhook-token",
          resource: "me/calendars/cal1/events/event1",
          changeType: "created",
        },
        {
          subscriptionId: "sub1",
          clientState: "test-webhook-token",
          resource: "me/calendars/cal1/events/event2",
          changeType: "updated",
        },
      ],
    };

    (SelectedCalendarRepository.findManyByOutlookSubscriptionIds as any).mockResolvedValue([
      {
        outlookSubscriptionId: "sub1",
        externalId: "cal1",
        credential: { id: 1, selectedCalendars: [{ externalId: "cal1" }] },
      },
    ]);

    (getCredentialForCalendarCache as any).mockResolvedValue({ id: 1 });
    const mockCalendarService = { fetchAvailabilityAndSetCache: vi.fn().mockResolvedValue(undefined) };
    (getCalendar as any).mockResolvedValue(mockCalendarService);

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.json).toHaveBeenCalledWith({
      message: "ok",
      processed: 1,
      failed: 0,
      skipped: 1,
      errors: ["Duplicate subscriptionId sub1"],
    });
    expect(mockCalendarService.fetchAvailabilityAndSetCache).toHaveBeenCalledWith([{ externalId: "cal1" }]);
  });

  it("should skip notifications with no matching SelectedCalendar", async () => {
    req.body = {
      value: [
        {
          subscriptionId: "sub1",
          clientState: "test-webhook-token",
          resource: "me/calendars/cal1/events/event1",
          changeType: "created",
        },
      ],
    };

    (SelectedCalendarRepository.findManyByOutlookSubscriptionIds as any).mockResolvedValue([]);

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.json).toHaveBeenCalledWith({
      message: "ok",
      processed: 0,
      failed: 0,
      skipped: 1,
      errors: ["No SelectedCalendar found for subscription sub1"],
    });
  });

  it("should skip notifications with no credential", async () => {
    req.body = {
      value: [
        {
          subscriptionId: "sub1",
          clientState: "test-webhook-token",
          resource: "me/calendars/cal1/events/event1",
          changeType: "created",
        },
      ],
    };

    (SelectedCalendarRepository.findManyByOutlookSubscriptionIds as any).mockResolvedValue([
      {
        outlookSubscriptionId: "sub1",
        externalId: "cal1",
        credential: null,
      },
    ]);

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.json).toHaveBeenCalledWith({
      message: "ok",
      processed: 0,
      failed: 0,
      skipped: 1,
      errors: ["No credential found for subscription sub1"],
    });
  });

  it("should process valid notifications and update cache", async () => {
    req.body = {
      value: [
        {
          subscriptionId: "sub1",
          clientState: "test-webhook-token",
          resource: "me/calendars/cal1/events/event1",
          changeType: "created",
        },
      ],
    };

    (SelectedCalendarRepository.findManyByOutlookSubscriptionIds as any).mockResolvedValue([
      {
        outlookSubscriptionId: "sub1",
        externalId: "cal1",
        credential: { id: 1, selectedCalendars: [{ externalId: "cal1" }] },
      },
    ]);

    (getCredentialForCalendarCache as any).mockResolvedValue({ id: 1 });
    const mockCalendarService = { fetchAvailabilityAndSetCache: vi.fn().mockResolvedValue(undefined) };
    (getCalendar as any).mockResolvedValue(mockCalendarService);

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.json).toHaveBeenCalledWith({
      message: "ok",
      processed: 1,
      failed: 0,
      skipped: 0,
      errors: [],
    });
    expect(mockCalendarService.fetchAvailabilityAndSetCache).toHaveBeenCalledWith([{ externalId: "cal1" }]);
  });

  it("should handle cache update failures", async () => {
    req.body = {
      value: [
        {
          subscriptionId: "sub1",
          clientState: "test-webhook-token",
          resource: "me/calendars/cal1/events/event1",
          changeType: "created",
        },
      ],
    };

    (SelectedCalendarRepository.findManyByOutlookSubscriptionIds as any).mockResolvedValue([
      {
        outlookSubscriptionId: "sub1",
        externalId: "cal1",
        credential: { id: 1, selectedCalendars: [{ externalId: "cal1" }] },
      },
    ]);

    (getCredentialForCalendarCache as any).mockResolvedValue({ id: 1 });
    const mockCalendarService = {
      fetchAvailabilityAndSetCache: vi.fn().mockRejectedValue(new Error("Cache update failed")),
    };
    (getCalendar as any).mockResolvedValue(mockCalendarService);

    await postHandler(req as NextApiRequest, res as NextApiResponse);

    expect(res.json).toHaveBeenCalledWith({
      message: "ok",
      processed: 0,
      failed: 1,
      skipped: 0,
      errors: ["Failed to update cache for credential 1: Cache update failed"],
    });
  });
});
