import { WorkflowBookingListener } from "@calcom/ee/workflows/lib/domainEventListeners/workflowBookingListener";

import logger from "../logger";
import type {
  DomainEvent,
  DomainEventCtor,
  DomainEventHandler,
  DomainEventListener,
  DomainEventListenerCtor,
} from "./domainEvent";
import { listenerRegistry } from "./listenerRegistry";

const log = logger.getSubLogger({ prefix: ["[domainEvents]"] });

/**
 * Central event bus for dispatching and handling domain events.
 * Supports both blocking and non-blocking (default) handlers.
 */
export class DomainEventBus {
  private listeners = new Set<DomainEventListenerCtor>();
  private handlersByEvent = new Map<
    string, // DomainEvent name
    { blocking: DomainEventHandler[]; nonBlocking: DomainEventHandler[] }
  >();

  /**
   * Dispatches a domain event to all registered handlers.
   * @note It is an async function and should be awaited.
   */
  async dispatch(event: DomainEvent, timestamp = new Date()): Promise<void> {
    const eventCtor = event?.constructor as DomainEventCtor;
    const eventName = eventCtor?.eventName || eventCtor?.name;
    const handlers = this.handlersByEvent.get(eventName);
    if (handlers?.blocking.length) {
      await Promise.all(handlers.blocking.map((handler) => handler(event, timestamp)));
    }
    if (handlers?.nonBlocking?.length) {
      queueMicrotask(() => handlers.nonBlocking.forEach((handler) => handler(event, timestamp)));
    }
  }

  /** Registers multiple listeners with the event bus */
  addListeners(listeners: Array<DomainEventListener | DomainEventListenerCtor>): void {
    listeners.forEach((listener) => this.addListener(listener));
  }

  /** Registers a single DomainEventListener with the event bus */
  addListener(target: DomainEventListener | DomainEventListenerCtor): void {
    let listener: DomainEventListener;
    let ListenerCtor: DomainEventListenerCtor;
    if (typeof target === "function" && target.prototype?.constructor === target) {
      ListenerCtor = target as DomainEventListenerCtor;
      listener = new ListenerCtor();
    } else {
      listener = target as DomainEventListener;
      ListenerCtor = target.constructor as DomainEventListenerCtor;
    }

    if (this.listeners.has(ListenerCtor)) {
      log.warn(`DomainEventListener ${ListenerCtor.name} is already added.`);
      return;
    }

    this.listeners.add(ListenerCtor);

    const self = listener as Record<string, DomainEventHandler>;
    const listenerHandlers = listenerRegistry.getHandlers(listener.constructor.prototype);
    listenerHandlers?.forEach(({ domainEventName, method, options }) => {
      const handler: DomainEventHandler = async (event, timestamp) => {
        try {
          await self[method](event, timestamp);
        } catch (err) {
          log.error(`${ListenerCtor.name}.${method}()`, err);
        }
      };
      let handlers = this.handlersByEvent.get(domainEventName);
      if (!handlers) {
        handlers = { blocking: [], nonBlocking: [] };
        this.handlersByEvent.set(domainEventName, handlers);
      }
      if (options?.blocking) {
        handlers.blocking.push(handler);
      } else {
        handlers.nonBlocking.push(handler);
      }
    });
  }
}

/** Global DomainEventBus instance */
export const domainEventBus = new DomainEventBus();

/**
 * Temporary solution for initializing domain event listeners in Next.js web app and api/v1.
 * Current implementation:
 * - Ensures listeners are registered before any events are dispatched
 * - Adds listeners when domainEventBus is first imported
 *
 * Future improvements:
 * 1. Centralize event handling in api/v2:
 *    - Create event dispatch endpoint
 *    - Web app and api/v1 to forward events to this endpoint
 * 2. Implement distributed event broker:
 *    - Handle events across multiple services
 *    - Improve scalability and reliability
 */
domainEventBus.addListeners([
  WorkflowBookingListener,
  // Register other domain event listeners here
]);
