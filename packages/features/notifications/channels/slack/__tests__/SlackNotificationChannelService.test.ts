import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChannelConfig, NotificationEvent } from "../../../types/NotificationChannel";
import type { SlackApiClientService, SlackPostMessageResult } from "../SlackApiClientService";
import type { SlackMessage, SlackMessageFormatterService } from "../SlackMessageFormatterService";
import { SlackNotificationChannelService } from "../SlackNotificationChannelService";

function createMockLogger() {
  const logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getSubLogger: vi.fn(),
  };
  logger.getSubLogger.mockReturnValue(logger);
  return logger;
}

function createMockFormatter(): SlackMessageFormatterService {
  return {
    format: vi.fn().mockReturnValue({
      text: "Cal.com: New Booking Created",
      blocks: [{ type: "header", text: { type: "plain_text", text: "New Booking Created" } }],
    } satisfies SlackMessage),
  } as unknown as SlackMessageFormatterService;
}

function createMockApiClient(result?: Partial<SlackPostMessageResult>): SlackApiClientService {
  return {
    postMessage: vi.fn().mockResolvedValue({
      ok: true,
      ts: "1234567890.123456",
      ...result,
    }),
  } as unknown as SlackApiClientService;
}

function createEvent(
  triggerEvent: WebhookTriggerEvents = WebhookTriggerEvents.BOOKING_CREATED
): NotificationEvent {
  return {
    triggerEvent,
    payload: { booking: { id: 1, title: "Test" } },
    metadata: {
      userId: 1,
      teamId: null,
      bookingId: 1,
      eventTypeId: 1,
      timestamp: new Date().toISOString(),
    },
  };
}

function createConfig(overrides?: Partial<ChannelConfig>): ChannelConfig {
  return {
    channelType: "slack",
    destination: "C12345",
    credentialId: 1,
    settings: { botToken: "xoxb-test-token" },
    ...overrides,
  };
}

describe("SlackNotificationChannelService", () => {
  let channel: SlackNotificationChannelService;
  let mockFormatter: SlackMessageFormatterService;
  let mockApiClient: SlackApiClientService;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockFormatter = createMockFormatter();
    mockApiClient = createMockApiClient();
    mockLogger = createMockLogger();

    channel = new SlackNotificationChannelService({
      formatter: mockFormatter,
      apiClient: mockApiClient,
      logger: mockLogger,
    });
  });

  it("should have channelId of slack", () => {
    expect(channel.channelId).toBe("slack");
  });

  describe("canHandle", () => {
    it("should return true for any event", () => {
      expect(channel.canHandle(createEvent())).toBe(true);
      expect(channel.canHandle(createEvent(WebhookTriggerEvents.BOOKING_CANCELLED))).toBe(true);
      expect(channel.canHandle(createEvent(WebhookTriggerEvents.OOO_CREATED))).toBe(true);
    });
  });

  describe("send", () => {
    it("should format and post message successfully", async () => {
      const event = createEvent();
      const config = createConfig();

      const result = await channel.send(event, config);

      expect(result.success).toBe(true);
      expect(result.channelId).toBe("slack");
      expect(result.externalMessageId).toBe("1234567890.123456");
      expect(mockFormatter.format).toHaveBeenCalledWith(event.triggerEvent, event.payload);
      expect(mockApiClient.postMessage).toHaveBeenCalledWith({
        botToken: "xoxb-test-token",
        channel: "C12345",
        message: expect.objectContaining({ text: "Cal.com: New Booking Created" }),
      });
    });

    it("should return error when bot token is missing", async () => {
      const event = createEvent();
      const config = createConfig({ settings: {} });

      const result = await channel.send(event, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing Slack bot token");
      expect(mockApiClient.postMessage).not.toHaveBeenCalled();
    });

    it("should return error when settings is undefined", async () => {
      const event = createEvent();
      const config = createConfig({ settings: undefined });

      const result = await channel.send(event, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing Slack bot token");
    });

    it("should return error when Slack API fails", async () => {
      mockApiClient = createMockApiClient({ ok: false, error: "channel_not_found" });
      channel = new SlackNotificationChannelService({
        formatter: mockFormatter,
        apiClient: mockApiClient,
        logger: mockLogger,
      });

      const event = createEvent();
      const config = createConfig();

      const result = await channel.send(event, config);

      expect(result.success).toBe(false);
      expect(result.error).toBe("channel_not_found");
    });
  });
});
