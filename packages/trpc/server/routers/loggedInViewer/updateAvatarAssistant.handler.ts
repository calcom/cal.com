import type { Prisma } from "@prisma/client";
import type { GetServerSidePropsContext, NextApiResponse } from "next";

import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { type TUpdateAvatarAssistantInputSchema } from "./updateAvatarAssistant.schema";

const log = logger.getSubLogger({ prefix: ["updateProfile"] });
type UpdateProfileOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
  input: TUpdateAvatarAssistantInputSchema;
};

export const updateAvatarAssistant = async ({ ctx, input }: UpdateProfileOptions) => {
  const { user } = ctx;
  const data: Prisma.UserUpdateInput = {
    ...input,
  };

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data,
    select: {
      avatarId: true,
      voiceId: true,
      elevenlabsKey: true,
    },
  });

  return { ...input };
};
