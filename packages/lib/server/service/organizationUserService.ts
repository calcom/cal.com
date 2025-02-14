import prisma from "@calcom/prisma";
import type { IdentityProvider } from "@calcom/prisma/enums";

export class OrganizationUserService {
  static async checkIfUserShouldBelongToOrg(idP: IdentityProvider, email: string) {
    const [orgUsername, apexDomain] = email.split("@");

    const ORGANIZATIONS_AUTOLINK =
      process.env.ORGANIZATIONS_AUTOLINK === "1" || process.env.ORGANIZATIONS_AUTOLINK === "true";

    if (!ORGANIZATIONS_AUTOLINK || idP !== "GOOGLE") return { orgUsername, orgId: undefined };
    const existingOrg = await prisma.team.findFirst({
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
