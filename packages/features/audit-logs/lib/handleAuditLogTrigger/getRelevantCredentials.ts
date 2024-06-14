import prisma from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

function getFirstClause(userId: number[] | null | undefined, teamId: number | null | undefined) {
  const clauses = [];
  if (userId) {
    clauses.push({
      userId: {
        in: userId,
      },
    });
  }

  if (teamId) {
    clauses.push({
      teamId: {
        equals: teamId,
      },
    });
  }

  if (clauses.length > 1) {
    return { OR: [...clauses] };
  } else return clauses[0];
}

export async function getRelevantCredentials(user: { id: number; name: string }) {
  const userIds = [user.id as number];

  const firstClause = getFirstClause(userIds, null);

  const credentials = await prisma.credential.findMany({
    where: {
      AND: [
        firstClause,
        {
          type: {
            contains: AppCategories.auditLogs,
          },
        },
      ],
    },
  });
  return credentials;
}
