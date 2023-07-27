import prisma from "@calcom/prisma";

import { isOrganisationAdmin } from "./";

export async function getMembers({
  teamId,
  userId,
  orgId,
  limit,
  offset,
}: {
  teamId: number;
  userId: number;
  orgId: number;
  limit?: number;
  offset?: number;
}) {
  // Validate user is owner/admin in org
  const isOrgAdmin = !!(await isOrganisationAdmin(userId, orgId));
  if (!isOrgAdmin) {
    return [];
  }

  // Fetch memberships from team Id
  return (
    (await prisma.membership.findFirst({
      where: {
        teamId,
        team: {
          parent: {
            is: {
              id: orgId,
            },
          },
        },
      },
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
    })) || false
  );
}
