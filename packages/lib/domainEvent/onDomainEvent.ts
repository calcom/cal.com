import type { DomainEventCtor, DomainEventHandlerOptions } from "./domainEvent";
import { listenerRegistry } from "./listenerRegistry";

/**
 * Decorator for marking methods as domain event handlers.
 * @param domainEvent - The domain event class or name to handle
 * @param options - Optional configuration for the handler
 */
export function onDomainEvent(
  domainEvent: string | DomainEventCtor,
  options?: DomainEventHandlerOptions
): MethodDecorator {
  const domainEventName =
    typeof domainEvent === "string" ? domainEvent : domainEvent.eventName || domainEvent.name;
  return (target, propertyKey) =>
    listenerRegistry.addHandler(target, { domainEventName, method: String(propertyKey), options });
}
