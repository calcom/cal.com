import logger from "@calcom/lib/logger";

import type { IMessageHandler, EmitOptions, IWildcardMessageHandler } from "./types";

// Re-export types for convenience
export type { IMessageHandler, Message, EmitOptions, IWildcardMessageHandler } from "./types";

// Union type for all handler types
type AnyHandler<TMessage extends string, TPayloadMap extends Record<TMessage, unknown>> =
  | IMessageHandler<TMessage, TPayloadMap>
  | IWildcardMessageHandler;

export class BaseMessageBus<TMessage extends string, TPayloadMap extends Record<TMessage, unknown>> {
  static Messages: unknown;
  private handlers: Map<TMessage | "*", Set<AnyHandler<TMessage, TPayloadMap>>> = new Map();
  private log: ReturnType<typeof logger.getSubLogger>;

  constructor(loggerPrefix: string[] = ["MessageBus"]) {
    this.log = logger.getSubLogger({ prefix: loggerPrefix });
  }

  subscribe(handler: AnyHandler<TMessage, TPayloadMap>): void {
    const messageKey = handler.subscribedMessage as TMessage | "*";
    if (!this.handlers.has(messageKey)) {
      this.handlers.set(messageKey, new Set());
    }
    const eventHandlers = this.handlers.get(messageKey);
    if (eventHandlers) {
      eventHandlers.add(handler);
    }

    const handlerType = handler.forPersistentQueue ? "persistent queue" : "regular";
    this.log.debug(`Subscribed ${handlerType} handler for messages: ${handler.subscribedMessage}`);
  }

  unsubscribe(handler: AnyHandler<TMessage, TPayloadMap>): void {
    const messageKey = handler.subscribedMessage as TMessage | "*";
    const messageHandlers = this.handlers.get(messageKey);
    if (messageHandlers) {
      messageHandlers.delete(handler);
      if (messageHandlers.size === 0) {
        this.handlers.delete(messageKey);
      }
    }

    const handlerType = handler.forPersistentQueue ? "persistent queue" : "regular";
    this.log.debug(`Unsubscribed ${handlerType} handler for messages: ${handler.subscribedMessage}`);
  }

  async emit<T extends TMessage>(
    messageType: T,
    payload: TPayloadMap[T],
    options: EmitOptions = {}
  ): Promise<void> {
    // Get all handlers for specific message type and wildcard handlers
    const specificHandlers = this.handlers.get(messageType) || new Set();
    const wildcardHandlers = this.handlers.get("*") || new Set();

    const allHandlers = [...Array.from(specificHandlers), ...Array.from(wildcardHandlers)];

    if (allHandlers.length === 0) {
      this.log.debug(`No handlers registered for message: ${messageType}`);
      return;
    }

    // Filter handlers based on options and enabled state
    const enabledHandlers = allHandlers.filter((handler) => {
      // Skip persistent queue handlers if requested
      if (options.skipPersistentQueue && handler.forPersistentQueue) {
        this.log.debug(`Skipping persistent queue handler ${handler.constructor.name} for ${messageType}`);
        return false;
      }

      if (handler.isEnabled && !handler.isEnabled({ type: messageType, payload })) {
        const handlerType = handler.forPersistentQueue ? "persistent queue" : "regular";
        this.log.debug(
          `${handlerType} handler ${handler.constructor.name} for ${messageType} is disabled, skipping`
        );
        return false;
      }

      return true;
    });

    this.log.debug(`Emitting message: ${messageType} with ${enabledHandlers.length} handlers`);

    // Execute all enabled handlers
    const handlerPromises = enabledHandlers.map(async (handler) => {
      return handler.handle({
        type: messageType,
        payload,
      });
    });

    const results = await Promise.allSettled(handlerPromises);

    results.forEach((result) => {
      if (result.status === "rejected") {
        this.log.error(`Handler for ${messageType} failed:`, result.reason);
      }
    });
  }
}
