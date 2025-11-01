import type { GetServerSidePropsContext, NextApiResponse } from "next";
import { prisma } from "@calcom/prisma";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TRemoveSecondaryEmailInputSchema } from "./removeSecondaryEmail.schema";

type RemoveSecondaryEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
  input: TRemoveSecondaryEmailInputSchema;
};

export const removeSecondaryEmailHandler = async ({ ctx, input }: RemoveSecondaryEmailOptions) => {
  const { user } = ctx;
  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `removeSecondaryEmail.${user.id}`,
  });

  // Ensure the secondary email exists and belongs to the current user
  const existing = await prisma.secondaryEmail.findUnique({
    where: { id: input.id },
    select: { id: true, userId: true, email: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Secondary email not found" });
  }

  if (existing.userId !== user.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to delete this secondary email" });
  }

  const deleted = await prisma.secondaryEmail.delete({ where: { id: input.id } });

  return { data: deleted, message: "Secondary email removed" };
};