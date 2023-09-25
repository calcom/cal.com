import type { GetServerSidePropsContext, NextApiResponse } from "next";

import { sendEmailVerification } from "@calcom/features/auth/lib/verifyEmail";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { type TAddAdditionalEmailInputSchema } from "./addAdditionalEmail.schema";

type AddAdditionalEmailOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    res?: NextApiResponse | GetServerSidePropsContext["res"];
  };
  input: TAddAdditionalEmailInputSchema;
};

export const AddAdditionalEmailHandler = async ({ ctx, input }: AddAdditionalEmailOptions) => {
  const { user } = ctx;

  const foundEmail = user.additionalEmail.find((add_email) => add_email.email === input.additionalEmail);
  if (foundEmail || input.additionalEmail == user.email) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Duplicate Email not allowed" });
  }
  const result = await prisma.additionalEmail.create({
    data: {
      email: input.additionalEmail,
      parentUserId: user.id,
    },
  });

  await sendEmailVerification({
    email: result.email,
    parentUserId: result.parentUserId,
  });

  return {
    message: "Email added successfully",
  };
};
