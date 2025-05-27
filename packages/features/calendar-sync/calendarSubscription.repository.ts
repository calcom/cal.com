import prisma from "@calcom/prisma";
import type { CalendarSubscriptionStatus } from "@calcom/prisma/enums";

type ProviderType = string;
export class CalendarSubscriptionRepository {
  static async create({
    data,
  }: {
    data: {
      credentialId: number;
      externalCalendarId: string;
      providerType: ProviderType;
      status: CalendarSubscriptionStatus;
      providerSubscriptionId: string | null;
      providerSubscriptionKind: string | null;
      providerResourceId: string | null;
      providerResourceUri: string | null;
      providerExpiration: Date | null;
      activatedAt: Date;
    };
  }) {
    return prisma.calendarSubscription.create({
      data,
    });
  }

  static async update({
    where,
    data,
  }: {
    where: {
      id: string;
    };
    data: {
      providerSubscriptionId?: string | null;
      providerSubscriptionKind?: string | null;
      providerResourceId?: string | null;
      providerResourceUri?: string | null;
      providerExpiration?: Date | null;
      activatedAt?: Date;
      status?: CalendarSubscriptionStatus;
    };
  }) {
    return await prisma.calendarSubscription.update({
      where,
      data,
    });
  }

  static async upsert({
    where,
    createData,
    updateData,
  }: {
    where: {
      credentialId_externalCalendarId: {
        credentialId: number;
        externalCalendarId: string;
      };
    };
    createData: {
      externalCalendarId: string;
      credentialId: number;
      providerType: ProviderType;
      status?: CalendarSubscriptionStatus;
      calendarSyncId?: string | null;
    };
    updateData: {
      providerType?: ProviderType;
      status?: CalendarSubscriptionStatus;
    };
  }) {
    return prisma.calendarSubscription.upsert({
      where,
      update: updateData,
      create: createData,
    });
  }

  static async findUniqueById({ id }: { id: string }) {
    return prisma.calendarSubscription.findUnique({
      where: { id },
    });
  }

  static async findUniqueByProviderSubscriptionId({
    providerSubscriptionId,
    providerResourceId,
  }: {
    providerSubscriptionId: string;
    providerResourceId: string;
  }) {
    return prisma.calendarSubscription.findFirst({
      where: {
        providerSubscriptionId,
        providerResourceId,
      },
    });
  }

  static async findMany({
    where,
  }: {
    where: {
      integration?: string;
      externalCalendarId?: {
        in: string[];
      };
    };
  }) {
    return prisma.calendarSubscription.findMany({
      where,
    });
  }

  static async findManyRequiringRenewalOrActivation({ batchSize }: { batchSize: number }) {
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    const requiringRenewalOrActivation = await prisma.calendarSubscription.findMany({
      take: batchSize,
      where: {
        OR: [
          // Either PENDING subscriptions
          { status: "PENDING" },
          // Or ACTIVE subscriptions about to expire
          {
            status: "ACTIVE",
            providerExpiration: {
              lt: oneDayFromNow,
            },
          },
        ],
      },
      select: {
        id: true,
        credentialId: true,
        externalCalendarId: true,
        providerType: true,
        status: true,
      },
      orderBy: [
        // Process PENDING first, then by expiration date
        { status: "desc" },
        { providerExpiration: "asc" },
      ],
    });

    return requiringRenewalOrActivation;
  }

  static async findFirst({
    where,
  }: {
    where: {
      providerType?: ProviderType;
      status?: CalendarSubscriptionStatus;
      externalCalendarId?: string;
    };
  }) {
    return prisma.calendarSubscription.findFirst({
      where,
    });
  }
}
