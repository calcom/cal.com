import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PayloadBuilderFactory } from "../../../factory/versioned/PayloadBuilderFactory";
import type { IWebhookDataFetcher } from "../../../interface/IWebhookDataFetcher";
import type { IWebhookRepository } from "../../../interface/IWebhookRepository";
import type { ILogger } from "../../../interface/infrastructure";
import type { IWebhookService } from "../../../interface/services";
import { WebhookTaskConsumer } from "../../../service/WebhookTaskConsumer";
import type { MeetingWebhookTaskPayload } from "../../../types/webhookTask";

describe("MEETING_STARTED / MEETING_ENDED Trigger", () => {
  let consumer: WebhookTaskConsumer;
  let mockWebhookRepository: IWebhookRepository;
  let mockMeetingDataFetcher: IWebhookDataFetcher;
  let mockPayloadBuilderFactory: PayloadBuilderFactory;
  let mockWebhookService: IWebhookService;
  let mockLogger: ILogger;

  const createMockRawBooking = (overrides = {}) => ({
    id: 123,
    uid: "booking-uid-123",
    title: "Test Meeting",
    description: "",
    startTime: new Date("2026-04-01T10:00:00Z"),
    endTime: new Date("2026-04-01T11:00:00Z"),
    status: "ACCEPTED",
    location: "integrations:daily",
    customInputs: {},
    responses: {
      name: { label: "name", value: "Test User" },
      email: { label: "email", value: "test@example.com" },
    },
    userId: 789,
    userPrimaryEmail: "organizer@example.com",
    eventTypeId: 456,
    metadata: {},
    paid: false,
    createdAt: new Date("2026-04-01T09:00:00Z"),
    updatedAt: new Date("2026-04-01T09:00:00Z"),
    user: {
      email: "organizer@example.com",
      name: "Organizer",
      username: "organizer",
      timeZone: "UTC",
      locale: "en",
      uuid: "user-uuid-123",
      isPlatformManaged: false,
    },
    eventType: {
      bookingFields: null,
      team: null,
    },
    attendees: [
      {
        id: 1,
        name: "Attendee",
        email: "attendee@example.com",
        timeZone: "UTC",
        locale: "en",
        phoneNumber: null,
        bookingId: 123,
        noShow: false,
      },
    ],
    payment: [],
    references: [],
    userFieldsResponses: {},
    userUuid: "user-uuid-123",
    ...overrides,
  });

  const defaultSubscriber = {
    id: "sub-1",
    subscriberUrl: "https://example.com/webhook",
    payloadTemplate: null,
    appId: null,
    secret: null,
    time: null,
    timeUnit: null,
    eventTriggers: [WebhookTriggerEvents.MEETING_STARTED],
    version: "2021-10-20" as const,
  };

  const createPayload = (
    overrides?: Partial<MeetingWebhookTaskPayload>
  ): MeetingWebhookTaskPayload =>
    ({
      operationId: "op-1",
      timestamp: new Date().toISOString(),
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      bookingId: 123,
      bookingUid: "booking-uid-123",
      startTime: "2026-04-01T10:00:00Z",
      endTime: "2026-04-01T11:00:00Z",
      eventTypeId: 456,
      userId: 789,
      teamId: null,
      orgId: undefined,
      oAuthClientId: null,
      ...overrides,
    }) as MeetingWebhookTaskPayload;

  beforeEach(() => {
    mockWebhookRepository = {
      getSubscribers: vi.fn().mockResolvedValue([defaultSubscriber]),
    } as unknown as IWebhookRepository;

    mockMeetingDataFetcher = {
      canHandle: vi.fn((event) =>
        [WebhookTriggerEvents.MEETING_STARTED, WebhookTriggerEvents.MEETING_ENDED].includes(event)
      ),
      fetchEventData: vi.fn().mockResolvedValue({
        data: createMockRawBooking(),
      }),
      getSubscriberContext: vi.fn((payload: MeetingWebhookTaskPayload) => ({
        triggerEvent: payload.triggerEvent,
        userId: payload.userId,
        eventTypeId: payload.eventTypeId,
        teamId: payload.teamId,
        orgId: payload.orgId,
        oAuthClientId: payload.oAuthClientId,
      })),
    };

    mockPayloadBuilderFactory = {
      getBuilder: vi.fn().mockReturnValue({
        build: vi.fn().mockReturnValue({
          triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
          createdAt: new Date().toISOString(),
          payload: createMockRawBooking(),
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
      [mockMeetingDataFetcher],
      mockPayloadBuilderFactory,
      mockWebhookService,
      mockLogger,
    );
  });

  it("should process MEETING_STARTED webhook with raw booking data", async () => {
    const payload = createPayload();

    await consumer.processWebhookTask(payload, "task-1");

    expect(mockMeetingDataFetcher.canHandle).toHaveBeenCalledWith(WebhookTriggerEvents.MEETING_STARTED);
    expect(mockMeetingDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
    expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
      WebhookTriggerEvents.MEETING_STARTED,
      expect.objectContaining({
        triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      }),
      [defaultSubscriber]
    );
  });

  it("should process MEETING_ENDED webhook", async () => {
    const payload = createPayload({ triggerEvent: WebhookTriggerEvents.MEETING_ENDED });
    vi.mocked(mockMeetingDataFetcher.fetchEventData).mockResolvedValue({
      data: createMockRawBooking(),
    });
    vi.mocked(mockPayloadBuilderFactory.getBuilder).mockReturnValue({
      build: vi.fn().mockReturnValue({
        triggerEvent: WebhookTriggerEvents.MEETING_ENDED,
        createdAt: new Date().toISOString(),
        payload: createMockRawBooking(),
      }),
    });

    await consumer.processWebhookTask(payload, "task-2");

    expect(mockMeetingDataFetcher.fetchEventData).toHaveBeenCalledWith(payload);
    expect(mockWebhookService.processWebhooks).toHaveBeenCalled();
  });

  it("should skip delivery when no subscribers found", async () => {
    vi.mocked(mockWebhookRepository.getSubscribers).mockResolvedValueOnce([]);
    const payload = createPayload();

    await consumer.processWebhookTask(payload, "task-3");

    expect(mockMeetingDataFetcher.fetchEventData).not.toHaveBeenCalled();
    expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
  });

  it("should skip delivery when event data is null (booking not found)", async () => {
    vi.mocked(mockMeetingDataFetcher.fetchEventData).mockResolvedValueOnce({ data: null });
    const payload = createPayload();

    await consumer.processWebhookTask(payload, "task-4");

    expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Event data not found",
      expect.objectContaining({ triggerEvent: WebhookTriggerEvents.MEETING_STARTED })
    );
  });

  it("should pass correct subscriber context from payload", async () => {
    const payload = createPayload({
      userId: 101,
      eventTypeId: 202,
      teamId: 303,
      orgId: 404,
      oAuthClientId: "oauth-1",
    });

    await consumer.processWebhookTask(payload, "task-5");

    expect(mockMeetingDataFetcher.getSubscriberContext).toHaveBeenCalledWith(payload);
    expect(mockWebhookRepository.getSubscribers).toHaveBeenCalledWith({
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      userId: 101,
      eventTypeId: 202,
      teamId: 303,
      orgId: 404,
      oAuthClientId: "oauth-1",
    });
  });

  it("should build DTO with raw booking data for MEETING_STARTED", async () => {
    const payload = createPayload();
    const mockBuild = vi.fn().mockReturnValue({
      triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
      createdAt: payload.timestamp,
      payload: createMockRawBooking(),
    });
    vi.mocked(mockPayloadBuilderFactory.getBuilder).mockReturnValue({ build: mockBuild });

    await consumer.processWebhookTask(payload, "task-6");

    expect(mockBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerEvent: WebhookTriggerEvents.MEETING_STARTED,
        createdAt: payload.timestamp,
        booking: expect.objectContaining({
          id: 123,
          uid: "booking-uid-123",
          status: "ACCEPTED",
        }),
      })
    );
  });

  it("should rethrow errors from data fetcher", async () => {
    vi.mocked(mockMeetingDataFetcher.fetchEventData).mockRejectedValueOnce(new Error("DB timeout"));
    const payload = createPayload();

    await expect(consumer.processWebhookTask(payload, "task-7")).rejects.toThrow("DB timeout");
  });
});
