import logger from "@calcom/lib/logger";

export type Message<TPayload extends Record<string, unknown>> = {
  messageType: string;
  payload: TPayload;
};

export interface IMessageHandler<TMessage extends string, TPayloadMap extends Record<TMessage, unknown>> {
  subscribedMessage: TMessage;
  handle(payload: TPayloadMap[TMessage]): Promise<void>;
  isEnabled?(payload: TPayloadMap[TMessage]): boolean;
}

export class BaseMessageBus<TMessage extends string, TPayloadMap extends Record<TMessage, unknown>> {
  static Messages:unknown;
  private handlers: Map<TMessage, Set<IMessageHandler<TMessage, TPayloadMap>>> = new Map();
  private log: ReturnType<typeof logger.getSubLogger>;

  constructor(loggerPrefix: string[] = ["MessageBus"]) {
    this.log = logger.getSubLogger({ prefix: loggerPrefix });
  }

  subscribe<T extends TMessage>(handler: IMessageHandler<T, TPayloadMap>): void {
    if (!this.handlers.has(handler.subscribedMessage)) {
      this.handlers.set(handler.subscribedMessage, new Set());
    }
    const eventHandlers = this.handlers.get(handler.subscribedMessage);
    if (eventHandlers) {
      eventHandlers.add(handler);
    }

    this.log.debug(`Subscribed handler for messages: ${handler.subscribedMessage}`);
  }

  unsubscribe<T extends TMessage>(handler: IMessageHandler<T, TPayloadMap>): void {
    const messageHandlers = this.handlers.get(handler.subscribedMessage);
    if (messageHandlers) {
      messageHandlers.delete(handler);
      if (messageHandlers.size === 0) {
        this.handlers.delete(handler.subscribedMessage);
      }
    }

    this.log.debug(`Unsubscribed handler for messages: ${handler.subscribedMessage}`);
  }

  async emit<T extends TMessage>(messageType: T, payload: TPayloadMap[T]): Promise<void> {
    const messageHandlers = this.handlers.get(messageType);

    if (!messageHandlers || messageHandlers.size === 0) {
      this.log.debug(`No handlers registered for message: ${messageType}`);
      return;
    }

    this.log.debug(`Emitting message: ${messageType} with ${messageHandlers.size} handlers`);

    const enabledHandlers = Array.from(messageHandlers).filter((handler) => {
      if (handler.isEnabled && !handler.isEnabled(payload)) {
        this.log.debug(`Handler ${handler.constructor.name} for ${messageType} is disabled, skipping`);
        return false;
      }
      return true;
    });

    const handlerPromises = enabledHandlers.map(async (handler) => handler.handle(payload));
    const results = await Promise.allSettled(handlerPromises);
    
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        const handlerName = enabledHandlers[index].constructor.name;
        this.log.error(`Handler ${handlerName} for ${messageType} failed:`, result.reason);
      }
    });
  }
}
