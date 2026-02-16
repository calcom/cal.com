import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

export async function checkPermissions(args: {
  userId: number;
  teamId?: number;
  role: Prisma.MembershipWhereInput["role"];
  prismaTransactionClient?: Prisma.TransactionClient
}) {
  const { teamId, userId, role, prismaTransactionClient } = args;
  if (!teamId) return;
  const client = prismaTransactionClient ?? prisma
  const team = await client.team.findFirst({
    where: {
      id: teamId,
      members: {
        some: {
          userId,
          role,
        },
      },
    },
  });
  if (!team) throw new TRPCError({ code: "UNAUTHORIZED" });
}
