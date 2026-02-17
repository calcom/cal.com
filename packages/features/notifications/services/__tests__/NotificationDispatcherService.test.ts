import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ChannelConfig,
  INotificationChannel,
  NotificationDeliveryResult,
  NotificationEvent,
} from "../../types/NotificationChannel";
import { NotificationDispatcherService } from "../NotificationDispatcherService";

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

function createMockChannel(
  channelId: string,
  opts: { canHandle?: boolean; sendResult?: NotificationDeliveryResult; sendError?: Error } = {}
): INotificationChannel {
  return {
    channelId,
    canHandle: vi.fn().mockReturnValue(opts.canHandle ?? true),
    send: opts.sendError
      ? vi.fn().mockRejectedValue(opts.sendError)
      : vi.fn().mockResolvedValue(
          opts.sendResult ?? {
            success: true,
            channelId,
            externalMessageId: "msg-123",
          }
        ),
  };
}

function createNotificationEvent(
  triggerEvent: WebhookTriggerEvents = WebhookTriggerEvents.BOOKING_CREATED
): NotificationEvent {
  return {
    triggerEvent,
    payload: { booking: { id: 1, title: "Test Booking" } },
    metadata: {
      userId: 1,
      teamId: null,
      bookingId: 1,
      eventTypeId: 1,
      timestamp: new Date().toISOString(),
    },
  };
}

function createChannelConfig(channelType = "slack"): ChannelConfig {
  return {
    channelType,
    destination: "C12345",
    credentialId: 1,
    settings: { botToken: "xoxb-test" },
  };
}

describe("NotificationDispatcherService", () => {
  let dispatcher: NotificationDispatcherService;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let slackChannel: INotificationChannel;

  beforeEach(() => {
    mockLogger = createMockLogger();
    slackChannel = createMockChannel("slack");
    dispatcher = new NotificationDispatcherService({
      channels: [slackChannel],
      logger: mockLogger,
    });
  });

  describe("dispatch", () => {
    it("should deliver notification to matching channel", async () => {
      const event = createNotificationEvent();
      const configs = [createChannelConfig("slack")];

      const results = await dispatcher.dispatch(event, configs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].channelId).toBe("slack");
      expect(slackChannel.send).toHaveBeenCalledWith(event, configs[0]);
    });

    it("should return error for unregistered channel type", async () => {
      const event = createNotificationEvent();
      const configs = [createChannelConfig("teams")];

      const results = await dispatcher.dispatch(event, configs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("No channel registered for type: teams");
    });

    it("should skip channel that cannot handle event", async () => {
      const channel = createMockChannel("slack", { canHandle: false });
      dispatcher = new NotificationDispatcherService({
        channels: [channel],
        logger: mockLogger,
      });

      const event = createNotificationEvent();
      const configs = [createChannelConfig("slack")];

      const results = await dispatcher.dispatch(event, configs);

      expect(results).toHaveLength(0);
      expect(channel.send).not.toHaveBeenCalled();
    });

    it("should catch and return error when channel.send throws", async () => {
      const channel = createMockChannel("slack", {
        sendError: new Error("Slack API down"),
      });
      dispatcher = new NotificationDispatcherService({
        channels: [channel],
        logger: mockLogger,
      });

      const event = createNotificationEvent();
      const configs = [createChannelConfig("slack")];

      const results = await dispatcher.dispatch(event, configs);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Slack API down");
    });

    it("should dispatch to multiple configs", async () => {
      const event = createNotificationEvent();
      const configs = [createChannelConfig("slack"), createChannelConfig("slack")];

      const results = await dispatcher.dispatch(event, configs);

      expect(results).toHaveLength(2);
      expect(slackChannel.send).toHaveBeenCalledTimes(2);
    });

    it("should log failed deliveries", async () => {
      const channel = createMockChannel("slack", {
        sendResult: { success: false, channelId: "slack", error: "rate_limited" },
      });
      dispatcher = new NotificationDispatcherService({
        channels: [channel],
        logger: mockLogger,
      });

      const event = createNotificationEvent();
      const configs = [createChannelConfig("slack")];

      await dispatcher.dispatch(event, configs);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("getRegisteredChannels", () => {
    it("should return list of registered channel IDs", () => {
      const channels = dispatcher.getRegisteredChannels();
      expect(channels).toEqual(["slack"]);
    });

    it("should return multiple channels when registered", () => {
      const teamsChannel = createMockChannel("teams");
      dispatcher = new NotificationDispatcherService({
        channels: [slackChannel, teamsChannel],
        logger: mockLogger,
      });

      expect(dispatcher.getRegisteredChannels()).toEqual(["slack", "teams"]);
    });
  });
});
