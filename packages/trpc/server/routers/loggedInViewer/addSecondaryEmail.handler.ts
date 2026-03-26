import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { GetServerSidePropsContext, NextApiResponse } from "next";
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

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `addSecondaryEmail:${user.id}`,
  });

  const existingPrimaryEmail = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingPrimaryEmail) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Email already taken" });
  }

  const existingSecondaryEmail = await prisma.secondaryEmail.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingSecondaryEmail) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Email already taken" });
  }

  const updatedData = await prisma.secondaryEmail.create({
    data: { email: input.email, userId: user.id },
  });

  const extraParams: Record<string, string> = {};
  if (input.makePrimary) {
    extraParams.makePrimary = "true";
  }
  if (input.redirectTo) {
    extraParams.redirectTo = input.redirectTo;
  }

  const hasExtraParams = Object.keys(extraParams).length > 0;

  await sendEmailVerification({
    email: updatedData.email,
    username: user?.username ?? undefined,
    language: user.locale,
    secondaryEmailId: updatedData.id,
    ...(hasExtraParams && { extraParams }),
  });

  return {
    data: updatedData,
    message: "Secondary email added successfully",
  };
};
