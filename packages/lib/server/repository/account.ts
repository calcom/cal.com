import prisma from "@calcom/prisma";

export class AccountRepository {
  static async findUniqueByProviderAndProviderAccountId({
    provider,
    providerAccountId,
  }: {
    provider: string;
    providerAccountId: string;
  }) {
    return await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId,
        },
      },
      select: {
        providerEmail: true,
      },
    });
  }
}
