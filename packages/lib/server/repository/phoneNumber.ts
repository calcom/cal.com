import prisma from "@calcom/prisma";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

export class PhoneNumberRepository {
  static async findPhoneNumbersFromUserId({ userId }: { userId: number }) {
    return await prisma.calAiPhoneNumber.findMany({
      where: {
        userId,
        subscriptionStatus: PhoneNumberSubscriptionStatus.ACTIVE,
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
        status: PhoneNumberSubscriptionStatus.ACTIVE,
      },
    });
  }
}
