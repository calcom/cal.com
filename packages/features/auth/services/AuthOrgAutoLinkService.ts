import type { PrismaClient } from "@calcom/prisma";
import type { IdentityProvider } from "@calcom/prisma/enums";

export class AuthOrgAutoLinkService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly organizationsAutolink: boolean
  ) {}

  async checkOrgMembership(
    idP: IdentityProvider,
    email: string
  ): Promise<{ orgUsername: string; orgId: number | undefined }> {
    const [orgUsername, apexDomain] = email.split("@");

    if (!this.organizationsAutolink || idP !== "GOOGLE") {
      return { orgUsername, orgId: undefined };
    }

    const existingOrg = await this.prisma.team.findFirst({
      where: {
        organizationSettings: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: apexDomain,
        },
      },
      select: {
        id: true,
      },
    });

    return { orgUsername, orgId: existingOrg?.id };
  }
}
