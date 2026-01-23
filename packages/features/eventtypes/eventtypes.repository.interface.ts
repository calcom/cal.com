/**
 * EventTypes Repository Interface
 *
 * Central interface for EventType repository methods.
 * Add new methods here as needed by different features.
 */

export interface IEventTypesRepository {
  /**
   * Find parent event type ID for managed event types.
   *
   * Managed event types have a parentId - this is used to include parent webhooks
   * when a child event type is triggered.
   *
   * @param eventTypeId - The event type to check
   * @returns Parent ID if this is a managed child event type, null otherwise
   */
  findParentEventTypeId(eventTypeId: number): Promise<number | null>;
}
