import { CalendarSyncDirection } from "@calcom/prisma/enums";

import { CalendarSyncRepository } from "./calendarSync.repository";

export class CalendarSyncService {
  static async markAsUsedForDownstreamSync({ calendarSyncId }: { calendarSyncId: string }) {
    return CalendarSyncRepository.update({
      where: { id: calendarSyncId },
      data: { lastSyncedDownAt: new Date(), lastSyncDirection: CalendarSyncDirection.DOWNSTREAM },
      select: { id: true },
    });
  }
}
