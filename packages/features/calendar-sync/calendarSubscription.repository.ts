import prisma from "@calcom/prisma";

export class CalendarSubscriptionRepository {
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
}
