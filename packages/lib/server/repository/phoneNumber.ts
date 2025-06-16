import prisma from "@calcom/prisma";

export class PhoneNumberRepository {
  static async findPhoneNumbersFromUserId({ userId }: { userId: number }) {
    return await prisma.calAiPhoneNumber.findMany({
      where: {
        userId,
      },
    });
  }
}
