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
}
