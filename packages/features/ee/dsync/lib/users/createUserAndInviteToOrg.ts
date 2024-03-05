import type { TFunction } from "next-i18next";

import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import type { getTeamOrThrow } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

import dSyncUserSelect from "./dSyncUserSelect";

const createUserAndInviteToOrg = async ({
  userEmail,
  org,
  translation,
}: {
  userEmail: string;
  org: Awaited<ReturnType<typeof getTeamOrThrow>>;
  translation: TFunction;
}) => {
  const orgId = org.id;
  const [emailUser, emailDomain] = userEmail.split("@");
  const username = slugify(`${emailUser}-${emailDomain.split(".")[0]}`);
  const user = await prisma.user.create({
    data: {
      username,
      email: userEmail,
      // name: event.data?.givenName,
      // Assume verified since coming from directory
      verified: true,
      invitedTo: orgId,
      organizationId: orgId,
      teams: {
        create: {
          teamId: orgId,
          role: MembershipRole.MEMBER,
          accepted: true,
        },
      },
      profiles: {
        createMany: {
          data: [
            {
              uid: ProfileRepository.generateProfileUid(),
              username,
              organizationId: orgId,
            },
          ],
        },
      },
    },
    select: dSyncUserSelect,
  });

  return user;
};

export default createUserAndInviteToOrg;
