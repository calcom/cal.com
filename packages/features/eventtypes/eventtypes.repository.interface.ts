/**
 * EventTypes Repository Interface
 *
 * Central interface for EventType repository methods.
 */

export interface IEventTypesRepository {
  /**
   * @param eventTypeId - The event type to check
   * @returns Parent ID if this is a managed child event type, null otherwise
   */
  findParentEventTypeId(eventTypeId: number): Promise<number | null>;
}
