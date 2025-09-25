import { WEBAPP_URL } from "@calcom/lib/constants";
import { prisma } from "@calcom/prisma";
import { CalIdMembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { ZCreateCalidTeamInput } from "./create.schema";

type CreateTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateCalidTeamInput;
};

export const createCalidTeamHandler = async ({ ctx, input }: CreateTeamOptions) => {
  const { user } = ctx;
  const { slug, name } = input;

  const existingTeam = await prisma.calIdTeam.findFirst({
    where: {
      slug: slug,
    },
  });

  if (existingTeam) throw new TRPCError({ code: "BAD_REQUEST", message: "Team URL already taken" });

  const newTeam = await prisma.calIdTeam.create({
    data: {
      slug,
      name,
      members: {
        create: {
          userId: user.id,
          role: CalIdMembershipRole.OWNER,
          acceptedInvitation: true,
        },
      },
    },
  });

  return {
    success: true,
    team: newTeam,
    onboard_members_url: `${WEBAPP_URL}/settings/teams/${newTeam.id}/onboard-members`,
  };
};
