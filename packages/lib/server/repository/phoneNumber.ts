import prisma from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

export class PhoneNumberRepository {
  static async findMinimalPhoneNumber({ phoneNumber, userId }: { phoneNumber: string; userId: number }) {
    return await prisma.calAiPhoneNumber.findUniqueOrThrow({
      where: {
        phoneNumber,
        userId,
      },
    });
  }
  static async findPhoneNumbersFromUserId({ userId }: { userId: number }) {
    return await prisma.calAiPhoneNumber.findMany({
      where: {
        userId,
        OR: [{ subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE }, { subscriptionStatus: null }],
      },
      include: {
        aiSelfServeConfigurations: {
          select: {
            eventTypeId: true,
          },
        },
      },
    });
  }
  static async findUnassignedPhoneNumbersFromUserId({ userId }: { userId: number }) {
    return await prisma.calAiPhoneNumber.findMany({
      where: {
        userId,
        aiSelfServeConfigurations: null,
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
      },
    });
  }

  static async createPhoneNumber({
    phoneNumber,
    provider,
    userId,
  }: {
    phoneNumber: string;
    provider?: string;
    userId: number;
  }) {
    return await prisma.calAiPhoneNumber.create({
      data: {
        provider,
        userId,
        phoneNumber,
      },
    });
  }

  static async deletePhoneNumber({ phoneNumber, userId }: { phoneNumber: string; userId: number }) {
    return await prisma.calAiPhoneNumber.delete({
      where: {
        phoneNumber,
        userId,
      },
    });
  }
}
