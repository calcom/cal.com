import type { TDeleteTeamInputSchema } from "./deleteTeam.schema";

type DeleteOptions = {
  input: TDeleteTeamInputSchema;
};

export const deleteTeamHandler = async ({ input }: DeleteOptions) => {
  // delete all memberships
  await ctx.ctx.prisma.membership.deleteMany({
    where: {
      teamId: input.teamId,
    },
  });

  await ctx.ctx.prisma.team.delete({
    where: {
      id: input.teamId,
    },
  });
};

export default deleteTeamHandler;
