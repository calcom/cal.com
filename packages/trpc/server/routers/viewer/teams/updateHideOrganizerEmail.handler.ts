import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TUpdateHideOrganizerEmailInputSchema } from "./updateHideOrganizerEmail.schema";

type UpdateHideOrganizerEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateHideOrganizerEmailInputSchema;
};

export const updateHideOrganizerEmail = async ({ ctx, input }: UpdateHideOrganizerEmailOptions) => {
  const updatedTeam = await prisma.team.update({
    where: {
      id: input.id,
    },
    data: {
      hideOrganizerEmail: input.hideOrganizerEmail,
    },
  });

  return updatedTeam;
};

export default updateHideOrganizerEmail;
