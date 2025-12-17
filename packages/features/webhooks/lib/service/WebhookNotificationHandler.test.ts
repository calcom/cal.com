import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhookTriggerEvents, WebhookVersionEnum } from "@calcom/prisma/enums";

import type { BookingWebhookEventDTO, WebhookSubscriber } from "../dto/types";
import type { PayloadBuilderFactory } from "../factory/versioned/PayloadBuilderFactory";
import type { ILogger } from "../interface/infrastructure";
import type { IWebhookService } from "../interface/services";
import { WebhookNotificationHandler } from "./WebhookNotificationHandler";

describe("WebhookNotificationHandler", () => {
  let handler: WebhookNotificationHandler;
  let mockWebhookService: IWebhookService;
  let mockFactory: PayloadBuilderFactory;
  let mockLogger: ILogger;

  const mockSubscribers: WebhookSubscriber[] = [
    {
      id: "webhook-1",
      subscriberUrl: "https://example.com/webhook",
      payloadTemplate: null,
      appId: null,
      secret: "secret123",
      eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
      time: null,
      timeUnit: null,
      version: WebhookVersionEnum.V_2021_10_20,
    },
    {
      id: "webhook-2",
      subscriberUrl: "https://example2.com/webhook",
      payloadTemplate: null,
      appId: null,
      secret: "secret456",
      eventTriggers: [WebhookTriggerEvents.BOOKING_CREATED],
      time: null,
      timeUnit: null,
      version: WebhookVersionEnum.V_2021_10_20,
    },
  ];

  beforeEach(() => {
    // Mock webhook service
    mockWebhookService = {
      getSubscribers: vi.fn().mockResolvedValue(mockSubscribers),
      processWebhooks: vi.fn().mockResolvedValue(undefined),
      sendWebhook: vi.fn(),
      scheduleWebhook: vi.fn(),
      sendWebhookDirectly: vi.fn(),
    };

    // Mock factory
    mockFactory = {
      getBuilder: vi.fn().mockReturnValue({
        build: vi.fn().mockReturnValue({
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
          createdAt: "2024-01-15T10:00:00Z",
          payload: {
            bookingId: 1,
            title: "Test Meeting",
          },
        }),
      }),
      registerVersion: vi.fn(),
      getRegisteredVersions: vi.fn().mockReturnValue([WebhookVersionEnum.V_2021_10_20]),
    };

    // Mock logger
    mockLogger = {
      getSubLogger: vi.fn().mockReturnThis(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    handler = new WebhookNotificationHandler(mockWebhookService, mockFactory, mockLogger);
  });

  describe("Constructor", () => {
    it("should initialize with dependencies", () => {
      expect(handler).toBeInstanceOf(WebhookNotificationHandler);
    });

    it("should create sublogger", () => {
      expect(mockLogger.getSubLogger).toHaveBeenCalledWith({
        prefix: ["[WebhookNotificationHandler]"],
      });
    });
  });

  describe("handleNotification", () => {
    const mockDTO: BookingWebhookEventDTO = {
      triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
      createdAt: "2024-01-15T10:00:00Z",
      bookingId: 1,
      eventTypeId: 1,
      userId: 1,
      teamId: null,
      orgId: null,
      platformClientId: null,
      booking: {
        id: 1,
        eventTypeId: 1,
        userId: 1,
        smsReminderNumber: null,
      },
      eventType: {
        eventTitle: "Test Event",
        eventDescription: "Test Description",
        requiresConfirmation: false,
        price: 0,
        currency: "USD",
        length: 30,
      },
      evt: {
        type: "test-event",
        title: "Test Meeting",
        description: "Meeting description",
        startTime: "2024-01-15T10:00:00Z",
        endTime: "2024-01-15T10:30:00Z",
        organizer: {
          id: 1,
          email: "organizer@test.com",
          name: "Test Organizer",
          timeZone: "UTC",
          language: { locale: "en" },
        },
        attendees: [
          {
            email: "attendee@test.com",
            name: "Test Attendee",
            timeZone: "UTC",
            language: { locale: "en" },
          },
        ],
        uid: "booking-uid-123",
        customInputs: {},
        responses: {},
        userFieldsResponses: {},
      },
    };

    it("should query for subscribers with correct params", async () => {
      await handler.handleNotification(mockDTO);

      expect(mockWebhookService.getSubscribers).toHaveBeenCalledWith({
        userId: 1,
        eventTypeId: 1,
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        teamId: null,
        orgId: null,
        oAuthClientId: null,
      });
    });

    it("should use factory to build payload", async () => {
      await handler.handleNotification(mockDTO);

      expect(mockFactory.getBuilder).toHaveBeenCalledWith(WebhookVersionEnum.V_2021_10_20, WebhookTriggerEvents.BOOKING_CREATED);
    });

    it("should process webhooks with built payload", async () => {
      await handler.handleNotification(mockDTO);

      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.BOOKING_CREATED,
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
          payload: expect.any(Object),
        }),
        mockSubscribers
      );
    });

    it("should log debug messages", async () => {
      await handler.handleNotification(mockDTO);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        "Querying for webhook subscribers with params:",
        expect.any(Object)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Successfully processed webhook notification"),
        expect.any(Object)
      );
    });

    it("should return early when no subscribers found", async () => {
      mockWebhookService.getSubscribers.mockResolvedValue([]);

      await handler.handleNotification(mockDTO);

      expect(mockWebhookService.processWebhooks).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("No subscribers found"),
        expect.any(Object)
      );
    });

    it("should handle errors gracefully", async () => {
      const error = new Error("Test error");
      mockWebhookService.getSubscribers.mockRejectedValue(error);

      await expect(handler.handleNotification(mockDTO)).rejects.toThrow("Test error");

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Error handling webhook notification"),
        expect.objectContaining({
          error: "Test error",
        })
      );
    });

    it("should support dry run mode", async () => {
      await handler.handleNotification(mockDTO, true);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("Dry run mode"));
      expect(mockWebhookService.getSubscribers).not.toHaveBeenCalled();
    });
  });

  describe("Special Event Handling", () => {
    it("should handle AFTER_HOSTS_CAL_VIDEO_NO_SHOW without builder", async () => {
      const noShowDTO: WebhookEventDTO = {
        triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        createdAt: "2024-01-15T10:00:00Z",
        bookingId: 1,
        webhook: { id: "webhook-1" },
      };

      mockWebhookService.getSubscribers.mockResolvedValue(mockSubscribers);

      await handler.handleNotification(noShowDTO);

      // Factory should not be called for no-show events
      expect(mockFactory.getBuilder).not.toHaveBeenCalled();
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW,
          payload: {
            bookingId: 1,
            webhook: { id: "webhook-1" },
          },
        }),
        mockSubscribers
      );
    });

    it("should handle DELEGATION_CREDENTIAL_ERROR without builder", async () => {
      const errorDTO: WebhookEventDTO = {
        triggerEvent: WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR,
        createdAt: "2024-01-15T10:00:00Z",
        error: "Credential error",
        credential: { id: 1, type: "test" },
        user: { id: 1, email: "user@test.com" },
      };

      mockWebhookService.getSubscribers.mockResolvedValue(mockSubscribers);

      await handler.handleNotification(errorDTO);

      // Factory should not be called for delegation errors
      expect(mockFactory.getBuilder).not.toHaveBeenCalled();
      expect(mockWebhookService.processWebhooks).toHaveBeenCalledWith(
        WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR,
        expect.objectContaining({
          triggerEvent: WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR,
          payload: expect.objectContaining({
            error: "Credential error",
          }),
        }),
        mockSubscribers
      );
    });
  });

  describe("Version Handling", () => {
    it("should use default version (v2021-10-20) for all events currently", async () => {
      const dto: BookingWebhookEventDTO = {
        triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
        createdAt: "2024-01-15T10:00:00Z",
        booking: {
          id: 1,
          eventTypeId: 1,
          userId: 1,
          smsReminderNumber: null,
        },
        eventType: {
          eventTitle: "Test",
          eventDescription: "",
          requiresConfirmation: false,
          price: 0,
          currency: "USD",
          length: 30,
        },
        evt: {},
      };

      mockWebhookService.getSubscribers.mockResolvedValue(mockSubscribers);

      await handler.handleNotification(dto);

      expect(mockFactory.getBuilder).toHaveBeenCalledWith(WebhookVersionEnum.V_2021_10_20, WebhookTriggerEvents.BOOKING_CREATED);
    });
  });
});

