import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { TrpcSessionUser } from "../../../types";

export const ZGetOtherTeamInputSchema = z.object({
  teamId: z.number(),
});

export type TGetOtherTeamInputSchema = z.infer<typeof ZGetOtherTeamInputSchema>;

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetOtherTeamInputSchema;
};

export const getOtherTeamHandler = async ({ input }: GetOptions) => {
  // No need to validate if user is admin of org as we already do that on authedOrgAdminProcedure
  const team = await prisma.team.findUnique({
    where: {
      id: input.teamId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      bio: true,
      metadata: true,
      isPrivate: true,
      parent: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
  }

  return {
    ...team,
    safeBio: markdownToSafeHTML(team.bio),
  };
};

export default getOtherTeamHandler;
