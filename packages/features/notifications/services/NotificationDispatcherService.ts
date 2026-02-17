import type {
  ChannelConfig,
  INotificationChannel,
  NotificationDeliveryResult,
  NotificationEvent,
} from "../types/NotificationChannel";

interface ILogger {
  info(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  getSubLogger(options: { prefix: string[] }): ILogger;
}

export interface INotificationDispatcherDeps {
  channels: INotificationChannel[];
  logger: ILogger;
}

export class NotificationDispatcherService {
  private readonly log: ILogger;

  constructor(private readonly deps: INotificationDispatcherDeps) {
    this.log = deps.logger.getSubLogger({ prefix: ["[NotificationDispatcherService]"] });
  }

  async dispatch(
    event: NotificationEvent,
    subscriberConfigs: ChannelConfig[]
  ): Promise<NotificationDeliveryResult[]> {
    const results: NotificationDeliveryResult[] = [];

    for (const config of subscriberConfigs) {
      const channel = this.deps.channels.find((ch) => ch.channelId === config.channelType);

      if (!channel) {
        this.log.warn(`No channel registered for type: ${config.channelType}`);
        results.push({
          success: false,
          channelId: config.channelType,
          error: `No channel registered for type: ${config.channelType}`,
        });
        continue;
      }

      if (!channel.canHandle(event)) {
        this.log.debug(`Channel ${config.channelType} cannot handle event: ${event.triggerEvent}`);
        continue;
      }

      try {
        const result = await channel.send(event, config);
        results.push(result);

        if (!result.success) {
          this.log.error(`Failed to deliver notification via ${config.channelType}: ${result.error}`);
        }
      } catch (error) {
        this.log.error(
          `Error delivering notification via ${config.channelType}: ${error instanceof Error ? error.message : String(error)}`
        );
        results.push({
          success: false,
          channelId: config.channelType,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  getRegisteredChannels(): string[] {
    return this.deps.channels.map((ch) => ch.channelId);
  }
}
