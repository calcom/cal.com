import logger from "../logger";
import type { DomainEventHandlerOptions } from "./domainEvent";

const log = logger.getSubLogger({ prefix: ["[domainEvents]"] });

interface ListenerHandlerEntry {
  domainEventName: string;
  method: string;
  options?: DomainEventHandlerOptions;
}

// Registry for storing `@onDomainEvent()` handlers on specific listeners.
// This avoids using reflect-metadata, which is not supported in upcoming ECMAScript decorators.
// This makes migration to ECMAScript decorators easier when upgrading to TypeScript 5+.
class ListenerRegistry {
  /* eslint-disable @typescript-eslint/ban-types */
  private handlersByListenerPrototype = new Map<Object, ListenerHandlerEntry[]>();

  getHandlers(listenerPrototype: Object): ListenerHandlerEntry[] | undefined {
    return this.handlersByListenerPrototype.get(listenerPrototype);
  }

  addHandler(listenerPrototype: Object, handler: ListenerHandlerEntry): void {
    const handlers = this.handlersByListenerPrototype.get(listenerPrototype);
    if (!handlers) {
      this.handlersByListenerPrototype.set(listenerPrototype, [handler]);
      return;
    }

    const { domainEventName, method } = handler;
    const exists = handlers.some((x) => x.domainEventName === domainEventName && x.method === method);
    if (exists) {
      log.warn(`${listenerPrototype.constructor.name}.${method} already added for ${domainEventName}`);
    } else {
      handlers.push(handler);
    }
  }
}

export const listenerRegistry = new ListenerRegistry();
