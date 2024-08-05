import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TGetVerifiedEmailsInputSchema } from "./getVerifiedEmails.schema";

type GetVerifiedEmailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetVerifiedEmailsInputSchema;
};

export const getVerifiedEmailsHandler = async ({ ctx, input }: GetVerifiedEmailsOptions) => {
  const { user } = ctx;
  const { teamId } = input;
  let verifiedEmails: string[] = [user.email];

  if (teamId) {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
      },
      select: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
    }

    const isTeamMember = team.members.some((member) => member.userId === user.id);

    if (!isTeamMember) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this team" });
    }

    verifiedEmails = verifiedEmails.concat(team.members.map((member) => member.user.email));
  }

  const emails = (
    await prisma.verifiedEmail.findMany({
      where: {
        OR: [{ userId: user.id }, { teamId: input.teamId }],
      },
    })
  ).map((verifiedEmail) => verifiedEmail.email);

  verifiedEmails = verifiedEmails.concat(emails);

  return verifiedEmails;
};
