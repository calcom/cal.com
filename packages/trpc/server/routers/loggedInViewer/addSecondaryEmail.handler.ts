import type { GetServerSidePropsContext, NextApiResponse } from "next";

import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { TAddSecondaryEmailInputSchema } from "./addSecondaryEmail.schema";

type AddSecondaryEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
  input: TAddSecondaryEmailInputSchema;
};

export const addSecondaryEmailHandler = async ({ ctx, input }: AddSecondaryEmailOptions) => {
  const { user } = ctx;

  const exisingPrimaryEmail = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (exisingPrimaryEmail) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Email already used" });
  }

  const updatedData = await prisma.secondaryEmail.create({
    data: { ...input, userId: user.id },
  });

  await sendEmailVerification({
    email: updatedData.email,
    username: user?.username ?? undefined,
    language: user.locale,
    isSecondary: true,
  });

  return {
    data: updatedData,
    message: "Secondary email added successfully",
  };
};
