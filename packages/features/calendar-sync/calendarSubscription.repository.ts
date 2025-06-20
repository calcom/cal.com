import prisma from "@calcom/prisma";
import type { CalendarSubscriptionStatus } from "@calcom/prisma/enums";

type ProviderType = string;
const safeCalendarSubscriptionSelect = {
  id: true,
  credentialId: true,
  externalCalendarId: true,
  providerType: true,
  providerSubscriptionId: true,
  providerSubscriptionKind: true,
  providerResourceId: true,
  providerResourceUri: true,
  providerExpiration: true,
  status: true,
  lastSyncAt: true,
  lastError: true,
  createdAt: true,
  updatedAt: true,
  activatedAt: true,
  calendarSyncId: true,
};

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
      select: safeCalendarSubscriptionSelect,
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
      lastSyncAt?: Date;
      lastError?: string;
      lastErrorAt?: Date;
      calendarSyncId?: string | null;
    };
  }) {
    const { calendarSyncId, ...rest } = data;
    return await prisma.calendarSubscription.update({
      where,
      data: {
        ...rest,
        ...(calendarSyncId ? { calendarSync: { connect: { id: calendarSyncId } } } : {}),
      },
      select: safeCalendarSubscriptionSelect,
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
      select: safeCalendarSubscriptionSelect,
    });
  }

  static async findUniqueById({ id }: { id: string }) {
    return prisma.calendarSubscription.findUnique({
      where: { id },
      select: safeCalendarSubscriptionSelect,
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
      select: safeCalendarSubscriptionSelect,
    });
  }

  static async findMany({
    where,
  }: {
    where: {
      providerType?: ProviderType;
      externalCalendarId?: {
        in: string[];
      };
    };
  }) {
    return prisma.calendarSubscription.findMany({
      where,
      select: safeCalendarSubscriptionSelect,
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
      orderBy: [
        // Process PENDING first, then by expiration date
        { status: "desc" },
        { providerExpiration: "asc" },
      ],
      select: safeCalendarSubscriptionSelect,
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
      providerSubscriptionId?: string;
      providerResourceId?: string;
    };
  }) {
    return prisma.calendarSubscription.findFirst({
      where,
      select: safeCalendarSubscriptionSelect,
    });
  }
}
