import prisma from "@calcom/prisma";

export class SecondaryEmailRepository {
  static async findAllSecondaryEmailsByUserId(userId: number) {
    return await prisma.secondaryEmail.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
      },
    });
  }
}
