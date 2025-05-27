import prisma from "@calcom/prisma";
import type { CalendarSync } from "@calcom/prisma/client";
import type { Ensure } from "@calcom/types/utils";

type CalendarSyncCreateOrUpdatePossibleData = Omit<CalendarSync, "id" | "createdAt" | "updatedAt">;
export class CalendarSyncRepository {
  static async findBySubscriptionId({ subscriptionId }: { subscriptionId: string }) {
    return prisma.calendarSync.findUnique({
      where: { subscriptionId },
    });
  }

  static async upsertByUserIdAndExternalCalendarIdAndIntegration({
    userId,
    externalCalendarId,
    integration,
    createData,
    updateData,
  }: {
    userId: number;
    externalCalendarId: string;
    integration: string;
    createData: Ensure<
      Partial<CalendarSyncCreateOrUpdatePossibleData>,
      "userId" | "externalCalendarId" | "integration" | "credentialId" | "lastSyncDirection"
    >;
    updateData: Ensure<Partial<CalendarSyncCreateOrUpdatePossibleData>, "lastSyncDirection">;
  }) {
    return prisma.calendarSync.upsert({
      where: {
        userId_externalCalendarId_integration: {
          userId,
          externalCalendarId,
          integration,
        },
      },
      update: updateData,
      create: createData,
    });
  }

  static async update({ where, data }: { where: { id: string }; data: { subscriptionId?: string | null } }) {
    return prisma.calendarSync.update({
      where,
      data,
    });
  }
}
