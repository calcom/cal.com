import type { prisma } from "@calcom/prisma";
import type { AppCategories, Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

export class PrismaCredentialRepository {
  constructor(private readonly prismaClient: typeof prisma) {}

  /**
   * Rows are returned as stored — delegation linkage fields (e.g. delegationCredentialId)
   * are preserved. Callers that need rows marked as plain credentials must apply
   * buildNonDelegationCredentials themselves.
   */
  async findNonDelegationCredentialsByAppCategories({
    idToSearchObject,
    appCategories,
  }: {
    idToSearchObject: Prisma.CredentialWhereInput;
    appCategories: AppCategories[];
  }) {
    const credentials = await this.prismaClient.credential.findMany({
      where: {
        ...idToSearchObject,
        app: {
          categories: {
            hasSome: appCategories,
          },
        },
      },
      select: {
        ...credentialForCalendarServiceSelect,
        team: {
          select: {
            name: true,
          },
        },
      },
    });

    return credentials;
  }
}
