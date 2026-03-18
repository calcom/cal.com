import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ILogger } from "../../interface/infrastructure";
import type { OOOWebhookTaskPayload } from "../../types/webhookTask";
import { OOOWebhookDataFetcher } from "./OOOWebhookDataFetcher";

function createMockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getSubLogger: vi.fn().mockReturnThis(),
  };
}

function createMockOOORepository() {
  return {
    findByIdForWebhook: vi.fn(),
    findManyOOO: vi.fn(),
    findUserOOODays: vi.fn(),
    findOOOEntriesInInterval: vi.fn(),
  };
}

const dbEntry = {
  id: 42,
  uuid: "ooo-uuid-123",
  start: new Date("2025-12-22T00:00:00Z"),
  end: new Date("2025-12-23T00:00:00Z"),
  createdAt: new Date("2025-12-20T10:00:00.000Z"),
  updatedAt: new Date("2025-12-20T10:00:00.000Z"),
  notes: "Sick leave",
  reasonId: 1,
  reason: { emoji: "🏥", reason: "Sick leave" },
  user: { id: 5, name: "Test User", username: "testuser", email: "test@example.com", timeZone: "Asia/Dubai" },
  toUser: null,
};

function createPayload(overrides?: Partial<OOOWebhookTaskPayload>): OOOWebhookTaskPayload {
  return {
    operationId: "op-1",
    timestamp: new Date().toISOString(),
    triggerEvent: WebhookTriggerEvents.OOO_CREATED,
    oooEntryId: 42,
    userId: 5,
    teamId: 3,
    oAuthClientId: null,
    ...overrides,
  } as OOOWebhookTaskPayload;
}

describe("OOOWebhookDataFetcher", () => {
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockOOORepository: ReturnType<typeof createMockOOORepository>;
  let fetcher: OOOWebhookDataFetcher;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createMockLogger();
    mockOOORepository = createMockOOORepository();
    fetcher = new OOOWebhookDataFetcher(
      mockLogger as unknown as ILogger,
      mockOOORepository as never
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("canHandle", () => {
    it("should return true for OOO_CREATED only", () => {
      expect(fetcher.canHandle(WebhookTriggerEvents.OOO_CREATED)).toBe(true);
      expect(fetcher.canHandle(WebhookTriggerEvents.BOOKING_CREATED)).toBe(false);
      expect(fetcher.canHandle(WebhookTriggerEvents.FORM_SUBMITTED)).toBe(false);
    });
  });

  describe("fetchEventData", () => {
    it("should fetch OOO entry from DB and format dates with user timezone", async () => {
      mockOOORepository.findByIdForWebhook.mockResolvedValueOnce(dbEntry);
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(mockOOORepository.findByIdForWebhook).toHaveBeenCalledWith(42);
      expect(result).not.toBeNull();
      const oooEntry = (result as Record<string, unknown>).oooEntry as Record<string, unknown>;
      expect(oooEntry.id).toBe(42);
      expect(oooEntry.uuid).toBe("ooo-uuid-123");
      expect(oooEntry.notes).toBe("Sick leave");
      expect(oooEntry.reasonId).toBe(1);
      expect(oooEntry.reason).toEqual({ emoji: "🏥", reason: "Sick leave" });
      expect(oooEntry.user).toEqual({
        id: 5,
        name: "Test User",
        username: "testuser",
        email: "test@example.com",
        timeZone: "Asia/Dubai",
      });
      expect(oooEntry.toUser).toBeNull();
      expect(typeof oooEntry.start).toBe("string");
      expect(typeof oooEntry.end).toBe("string");
      expect(typeof oooEntry.createdAt).toBe("string");
      expect(typeof oooEntry.updatedAt).toBe("string");
    });

    it("should include toUser when present", async () => {
      const entryWithToUser = {
        ...dbEntry,
        toUser: { id: 10, name: "Backup", username: "backup", email: "backup@example.com", timeZone: "UTC" },
      };
      mockOOORepository.findByIdForWebhook.mockResolvedValueOnce(entryWithToUser);
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      const oooEntry = (result as Record<string, unknown>).oooEntry as Record<string, unknown>;
      expect(oooEntry.toUser).toEqual({
        id: 10,
        name: "Backup",
        username: "backup",
        email: "backup@example.com",
        timeZone: "UTC",
      });
    });

    it("should return null when OOO entry not found in DB", async () => {
      mockOOORepository.findByIdForWebhook.mockResolvedValueOnce(null);
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith("OOO entry not found", { oooEntryId: 42 });
    });

    it("should return null and log error on DB failure", async () => {
      mockOOORepository.findByIdForWebhook.mockRejectedValueOnce(new Error("DB timeout"));
      const payload = createPayload();

      const result = await fetcher.fetchEventData(payload);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith("Error fetching OOO data for webhook", {
        oooEntryId: 42,
        error: "DB timeout",
      });
    });
  });

  describe("getSubscriberContext", () => {
    it("should use teamIds from metadata when present", () => {
      const payload = createPayload({
        userId: 5,
        teamId: null,
        oAuthClientId: "oauth-1",
        metadata: { teamIds: [10, 20, 30], orgId: 99 },
      } as Partial<OOOWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        userId: 5,
        eventTypeId: undefined,
        teamId: [10, 20, 30],
        orgId: 99,
        oAuthClientId: "oauth-1",
      });
    });

    it("should fall back to payload.teamId when metadata has no teamIds", () => {
      const payload = createPayload({
        userId: 5,
        teamId: 3,
        oAuthClientId: null,
        metadata: {},
      } as Partial<OOOWebhookTaskPayload>);

      const context = fetcher.getSubscriberContext(payload);

      expect(context).toEqual({
        triggerEvent: WebhookTriggerEvents.OOO_CREATED,
        userId: 5,
        eventTypeId: undefined,
        teamId: 3,
        orgId: undefined,
        oAuthClientId: null,
      });
    });
  });
});
