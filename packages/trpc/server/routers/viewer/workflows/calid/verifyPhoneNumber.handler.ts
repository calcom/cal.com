import { verifyPhoneNumber } from "@calid/features/modules/workflows/utils/phoneVerification";

import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TCalIdVerifyPhoneNumberInputSchema } from "./verifyPhoneNumber.schema";

type CalIdVerifyPhoneNumberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdVerifyPhoneNumberInputSchema;
};

export const calIdVerifyPhoneNumberHandler = async ({ ctx, input }: CalIdVerifyPhoneNumberOptions) => {
  const { phoneNumber, code, calIdTeamId } = input;
  const { user } = ctx;
  const verifyStatus = await verifyPhoneNumber(phoneNumber, code, user.id, calIdTeamId);
  console.log("verifyStatus", verifyStatus);
  return verifyStatus;
};
