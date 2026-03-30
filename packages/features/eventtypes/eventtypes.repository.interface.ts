/**
 * EventTypes Repository Interface
 *
 * Central interface for EventType repository methods.
 */

import type { Prisma } from "@calcom/prisma/client";

export interface IEventTypesRepository {
  /**
   * @param eventTypeId - The event type to check
   * @returns Parent ID if this is a managed child event type, null otherwise
   */
  findParentEventTypeId(eventTypeId: number): Promise<number | null>;

  /**
   * Hides and renames personal (non-managed) event types matching the given userIds and slugs.
   * Appends "-personal-{id}" to slug, " [Personal]" to title, and sets hidden=true.
   */
  hideAndRenamePersonalByUserIdsAndSlugs(params: {
    userIds: number[];
    slugs: string[];
    tx?: Prisma.TransactionClient;
  }): Promise<{ count: number }>;
}
