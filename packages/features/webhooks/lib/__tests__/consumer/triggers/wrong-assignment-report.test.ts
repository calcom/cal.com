import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PayloadBuilderFactory } from "../../../factory/versioned/PayloadBuilderFactory";
import { createPayloadBuilderFactory } from "../../../factory/versioned/registry";
import type { IWebhookDataFetcher } from "../../../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../../../interface/IWebhookRepository";
import { WebhookVersion } from "../../../interface/IWebhookRepository";
import type { ILogger } from "../../../interface/infrastructure";
import type { IWebhookService } from "../../../interface/services";
import { WebhookTaskConsumer } from "../../../service/WebhookTaskConsumer";
import type { WrongAssignmentWebhookTaskPayload } from "../../../types/webhookTask";

const createMockMetadata = (overrides = {}) => ({
  booking: {
    uid: "booking-uid-123",
    id: 100,
    title: "Sales Call",
    startTime: "2025-01-15T14:00:00.000Z",
    endTime: "2025-01-15T14:30:00.000Z",
    status: "ACCEPTED",
    eventType: {
      id: 10,
      title: "Sales Call",
      slug: "sales-call",
      teamId: 5,
    },
  },
  report: {
    reportedBy: { id: 1, email: "reporter@example.com", name: "Reporter" },
    firstAssignmentReason: "Routed based on company size: Enterprise",
    guest: "lead@company.com",
    host: { email: "assigned-rep@example.com", name: "Assigned Rep" },
    correctAssignee: "correct-rep@example.com",
    additionalNotes: "Wrong team assignment",
  },
  ...overrides,
});

describe("WRONG_ASSIGNMENT_REPORT Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockDataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const defaultSubscriber = {
    id: "sub-1",
    subscriberUrl: "https://example.com/webhook",
    payloadTemplate: null,
    appId: null,
    secret: "secret",
    time: null,
    timeUnit: null,
    eventTriggers: [WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT],
    version: WebhookVersion.V_2021_10_20,
  };

  beforeEach(() => {
    mockWebhookRepository = {
      getSubscribers: vi.fn().mockResolvedValue([]),
      getWebhookById: vi.fn(),
      findByWebhookId: vi.fn(),
      findByOrgIdAndTrigger: vi.fn(),
      getFilteredWebhooksForUser: vi.fn(),
    } as unknown as IWebhookRepository;

    mockDataFetcher = {
      canHandle: vi.fn((event) => event === WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT),
      fetchEventData: vi.fn().mockResolvedValue({ data: createMockMetadata() }),
      getSubscriberContext: vi.fn((payload: WrongAssignmentWebhookTaskPayload) => ({
        triggerEvent: payload.triggerEvent,
        userId: payload.userId ?? undefined,
        eventTypeId: undefined,
        teamId: payload.teamId,
        orgId: payload.orgId ?? undefined,
        oAuthClientId: undefined,
      })),
    };

    mockPayloadBuilderFactory = {
      getBuilder: vi.fn().mockReturnValue({
        build: vi.fn().mockReturnValue({
          triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
          createdAt: new Date().toISOString(),
          payload: createMockMetadata(),
        }),
      }),
    } as unknown as PayloadBuilderFactory;

    mockWebhookService = {
      processWebhooks: vi.fn().mockResolvedValue(undefined),
    } as unknown as IWebhookService;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      getSubLogger: vi.fn().mockReturnThis(),
    } as unknown as ILogger;

    consumer = new WebhookTaskConsumer(
      mockWebhookRepository,
      [mockDataFetcher],
      mockPayloadBuilderFactory,
      mockWebhookService,
      mockLogger
    );
  });

  describe("Consumer pipeline", () => {
    it("should process WRONG_ASSIGNMENT_REPORT end-to-end", async () => {
      const payload: WrongAssignmentWebhookTaskPayload = {
        operationId: "op-wrong-assign-1",
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
        bookingUid: "booking-uid-123",
        userId: 2,
        teamId: 5,
        orgId: 1,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-wrong-assign-1");

      expect(mockDataFetcher.canHandle).toHaveBeenCalledWith(WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT);
      expect(mockDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
        expect.any(Object),
        expect.arrayContaining([expect.objectContaining({ subscriberUrl: "https://example.com/webhook" })])
      );
    });

    it("should skip delivery when no subscribers found", async () => {
      const payload: WrongAssignmentWebhookTaskPayload = {
        operationId: "op-no-subs",
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
        bookingUid: "booking-uid-123",
        userId: 2,
        teamId: 5,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([]);

      await consumer.processWebhookTask(payload, "task-no-subs");

      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });

    it("should return early when data fetcher returns null", async () => {
      vi.mocked(mockDataFetcher.fetchEventData).mockResolvedValueOnce({ data: null });
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const payload: WrongAssignmentWebhookTaskPayload = {
        operationId: "op-null-data",
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
        bookingUid: "booking-uid-123",
        userId: 2,
        teamId: 5,
        timestamp: new Date().toISOString(),
      };

      await consumer.processWebhookTask(payload, "task-null-data");

      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    });

    it("should pass correct subscriber context from payload", async () => {
      const payload: WrongAssignmentWebhookTaskPayload = {
        operationId: "op-context",
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
        bookingUid: "booking-uid-123",
        userId: 42,
        teamId: 10,
        orgId: 3,
        timestamp: new Date().toISOString(),
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      await consumer.processWebhookTask(payload, "task-context");

      expect(mockDataFetcher.getSubscriberContext).toHaveBeenCalledWith(payload);
    });
  });

  describe("Integration: real PayloadBuilder verifies webhook payload content", () => {
    const realPayloadBuilderFactory = createPayloadBuilderFactory();

    function buildConsumerWithRealBuilder() {
      return new WebhookTaskConsumer(
        mockWebhookRepository,
        [mockDataFetcher],
        realPayloadBuilderFactory,
        mockWebhookService,
        mockLogger
      );
    }

    function getDeliveredWebhookEnvelope(): {
      triggerEvent: string;
      createdAt: string;
      payload: Record<string, unknown>;
    } {
      const [, webhookPayload] = vi.mocked(mockWebhookService.processWebhooks).mock.calls[0];
      return webhookPayload as { triggerEvent: string; createdAt: string; payload: Record<string, unknown> };
    }

    it("delivers correct triggerEvent, createdAt, and payload structure", async () => {
      const timestamp = "2025-01-15T10:30:00.000Z";
      const payload: WrongAssignmentWebhookTaskPayload = {
        operationId: "op-real-builder",
        triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
        bookingUid: "booking-uid-123",
        userId: 2,
        teamId: 5,
        orgId: 1,
        timestamp,
      };

      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(payload, "task-real-builder");

      const envelope = getDeliveredWebhookEnvelope();
      expect(envelope.triggerEvent).toBe("WRONG_ASSIGNMENT_REPORT");
      expect(envelope.createdAt).toBe(timestamp);

      const p = envelope.payload as Record<string, unknown>;
      expect(p).toHaveProperty("booking");
      expect(p).toHaveProperty("report");
    });

    it("payload.booking matches metadata booking fields", async () => {
      const metadata = createMockMetadata();
      vi.mocked(mockDataFetcher.fetchEventData).mockResolvedValueOnce({ data: metadata });
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-booking-fields",
          triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
          bookingUid: "booking-uid-123",
          userId: 2,
          teamId: 5,
          timestamp: new Date().toISOString(),
        },
        "task-booking-fields"
      );

      const p = getDeliveredWebhookEnvelope().payload as { booking: Record<string, unknown> };
      expect(p.booking).toEqual(
        expect.objectContaining({
          uid: "booking-uid-123",
          id: 100,
          title: "Sales Call",
          status: "ACCEPTED",
        })
      );
      expect(p.booking.eventType).toEqual(
        expect.objectContaining({ id: 10, title: "Sales Call", slug: "sales-call", teamId: 5 })
      );
    });

    it("payload.report matches metadata report fields", async () => {
      const metadata = createMockMetadata();
      vi.mocked(mockDataFetcher.fetchEventData).mockResolvedValueOnce({ data: metadata });
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-report-fields",
          triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
          bookingUid: "booking-uid-123",
          userId: 2,
          teamId: 5,
          timestamp: new Date().toISOString(),
        },
        "task-report-fields"
      );

      const p = getDeliveredWebhookEnvelope().payload as { report: Record<string, unknown> };
      expect(p.report).toEqual(
        expect.objectContaining({
          firstAssignmentReason: "Routed based on company size: Enterprise",
          guest: "lead@company.com",
          correctAssignee: "correct-rep@example.com",
          additionalNotes: "Wrong team assignment",
        })
      );
      expect(p.report.reportedBy).toEqual(
        expect.objectContaining({ id: 1, email: "reporter@example.com", name: "Reporter" })
      );
      expect(p.report.host).toEqual(
        expect.objectContaining({ email: "assigned-rep@example.com", name: "Assigned Rep" })
      );
    });

    it("handles null eventType in booking", async () => {
      const metadata = createMockMetadata({
        booking: {
          uid: "booking-uid-no-et",
          id: 200,
          title: "No Event Type",
          startTime: "2025-01-15T14:00:00.000Z",
          endTime: "2025-01-15T14:30:00.000Z",
          status: "ACCEPTED",
          eventType: null,
        },
      });
      vi.mocked(mockDataFetcher.fetchEventData).mockResolvedValueOnce({ data: metadata });
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-null-et",
          triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
          bookingUid: "booking-uid-no-et",
          userId: 2,
          teamId: null,
          timestamp: new Date().toISOString(),
        },
        "task-null-et"
      );

      const p = getDeliveredWebhookEnvelope().payload as { booking: Record<string, unknown> };
      expect(p.booking.eventType).toBeNull();
    });

    it("handles null firstAssignmentReason and guest", async () => {
      const metadata = createMockMetadata({
        report: {
          reportedBy: { id: 1, email: "reporter@example.com", name: null },
          firstAssignmentReason: null,
          guest: null,
          host: { email: "host@example.com", name: null },
          correctAssignee: null,
          additionalNotes: "No routing reason available",
        },
      });
      vi.mocked(mockDataFetcher.fetchEventData).mockResolvedValueOnce({ data: metadata });
      vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([defaultSubscriber]);

      const consumerWithRealBuilder = buildConsumerWithRealBuilder();
      await consumerWithRealBuilder.processWebhookTask(
        {
          operationId: "op-null-fields",
          triggerEvent: WebhookTriggerEvents.WRONG_ASSIGNMENT_REPORT,
          bookingUid: "booking-uid-123",
          userId: 2,
          teamId: 5,
          timestamp: new Date().toISOString(),
        },
        "task-null-fields"
      );

      const p = getDeliveredWebhookEnvelope().payload as { report: Record<string, unknown> };
      expect(p.report.firstAssignmentReason).toBeNull();
      expect(p.report.guest).toBeNull();
      expect(p.report.correctAssignee).toBeNull();
    });
  });
});
