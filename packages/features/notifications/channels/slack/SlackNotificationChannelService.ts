import type {
  ChannelConfig,
  INotificationChannel,
  NotificationDeliveryResult,
  NotificationEvent,
} from "../../types/NotificationChannel";
import type { SlackApiClientService } from "./SlackApiClientService";
import type { SlackMessageFormatterService } from "./SlackMessageFormatterService";

interface ILogger {
  info(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  getSubLogger(options: { prefix: string[] }): ILogger;
}

export interface ISlackNotificationChannelDeps {
  formatter: SlackMessageFormatterService;
  apiClient: SlackApiClientService;
  logger: ILogger;
}

export class SlackNotificationChannelService implements INotificationChannel {
  readonly channelId = "slack";
  private readonly log: ILogger;

  constructor(private readonly deps: ISlackNotificationChannelDeps) {
    this.log = deps.logger.getSubLogger({ prefix: ["[SlackNotificationChannelService]"] });
  }

  canHandle(_event: NotificationEvent): boolean {
    return true;
  }

  async send(event: NotificationEvent, config: ChannelConfig): Promise<NotificationDeliveryResult> {
    const botToken = config.settings?.botToken as string | undefined;
    if (!botToken) {
      return {
        success: false,
        channelId: this.channelId,
        error: "Missing Slack bot token in channel config",
      };
    }

    const message = this.deps.formatter.format(event.triggerEvent, event.payload);
    const result = await this.deps.apiClient.postMessage({
      botToken,
      channel: config.destination,
      message,
    });

    if (!result.ok) {
      this.log.error(`Slack delivery failed for channel ${config.destination}: ${result.error}`);
    }

    return {
      success: result.ok,
      channelId: this.channelId,
      externalMessageId: result.ts,
      error: result.error,
    };
  }
}
