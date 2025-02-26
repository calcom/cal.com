import prisma from "@calcom/prisma";
import type { CalendarSync } from "@calcom/prisma/client";
import type { CalendarSyncDirection } from "@calcom/prisma/enums";
import type { Ensure } from "@calcom/types/utils";

type CalendarSyncCreateOrUpdatePossibleData = Omit<CalendarSync, "id" | "createdAt" | "updatedAt">;
export class CalendarSyncRepository {
  static async findBySubscriptionId({ subscriptionId }: { subscriptionId: string }) {
    return prisma.calendarSync.findUnique({
      where: { subscriptionId },
      select: {
        id: true,
        externalCalendarId: true,
        credentialId: true,
      },
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
      select: {
        id: true,
        externalCalendarId: true,
        credentialId: true,
        integration: true,
      },
    });
  }

  static async update({
    where,
    data,
    select,
  }: {
    where: { id: string };
    data: {
      subscriptionId?: string | null;
      lastSyncedDownAt?: Date | null;
      lastSyncDirection?: CalendarSyncDirection | null;
    };
    select?: {
      id: true;
    };
  }) {
    return prisma.calendarSync.update({
      where,
      data,
      select,
    });
  }
}
