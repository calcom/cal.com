/* eslint-disable @typescript-eslint/no-empty-interface */

/*
 * Domain events let parts of the system react to changes elsewhere without tight coupling.
 *
 * Example: Creating a Booking
 *
 *     Upstream                 Core Domain               Downstream
 *     ========                 ===========               ==========
 *                         ┌════════════════════┐
 *                         ║                    ║
 * EventType ───────────▶  ║      Booking       ║ -------------▶ Workflow
 *                         ║   (Core Domain)    ║   (BookingCreated)
 * Availability ────────▶  ║                    ║
 *                         ║                    ║
 *   Routing ───────────▶  ║                    ║
 *                         └════════════════════┘
 *
 * - Booking depends on `EventType`, `Availability`, and `Routing` during creation.
 * - Booking emits `BookingCreated` and other lifecycle events.
 * - Subscribers (e.g., `Workflow`) listen and react — e.g. send notifications.
 */

/**
 * Marker interface for domain events.
 * Domain events are plain objects published to the `DomainEventBus`.
 *
 * The event name used for routing is determined by:
 * 1. The static `eventName` property on the event class (if present)
 * 2. The constructor name of the event class (fallback)
 *
 * @example ```
 * // Using constructor name as event name
 * class BookingCreated implements DomainEvent {
 *   constructor (public readonly bookingId: string) {}
 * }
 *
 * // Using custom event name
 * class BookingRescheduled implements DomainEvent {
 *   static eventName = "booking.rescheduled";
 *   constructor (public readonly bookingId: string) {}
 * }
 * ```
 */
export interface DomainEvent {}

/** Constructor type for domain events. */
export interface DomainEventCtor {
  /** The constructor name, used as event name by default. */
  name: string;
  /** The event name, to override the default constructor name. */
  eventName?: string;
}

/**
 * Marker interface for domain event listeners.
 * A DomainEventListener groups related domain event handlers into a single class
 * so they can be colocated and registered together in the `DomainEventBus`.
 *
 * @example ```
 * class WorkflowBookingListener implements DomainEventListener {
 *   @onDomainEvent(BookingCreated)
 *   async onBookingCreated(event: BookingCreated) {
 *     // Trigger workflows when booking is created
 *   }
 *   @onDomainEvent(BookingCancelled)
 *   async onBookingCancelled(event: BookingCancelled) {
 *     // Trigger workflows when booking is cancelled
 *   }
 * }
 * ```
 */
export interface DomainEventListener {}

/** Constructor type for domain event listeners. */
export interface DomainEventListenerCtor {
  new (): DomainEventListener;
}

/** DomainEventListener methods with `@onDomainEvent()` decorator. */
export interface DomainEventHandler<T extends DomainEvent = DomainEvent> {
  (event: T, timestamp: Date): void | Promise<void>;
}

/** Options for domain event handlers */
export interface DomainEventHandlerOptions {
  /** Whether the handler should block execution until completed */
  blocking?: boolean;
}
