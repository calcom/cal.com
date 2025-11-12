import prisma from "@calcom/prisma";

import { VerifiedNumberRepository } from "../../repositories/VerifiedNumberRepository";
import * as twilio from "./providers/twilioProvider";

export const sendVerificationCode = async (phoneNumber: string) => {
  return twilio.sendVerificationCode(phoneNumber);
};

export const verifyPhoneNumber = async (
  phoneNumber: string,
  code: string,
  userId?: number,
  teamId?: number
) => {
  if (!userId && !teamId) return true;

  const verificationStatus = await twilio.verifyNumber(phoneNumber, code);

  if (verificationStatus === "approved") {
    const verifiedNumberRepository = new VerifiedNumberRepository(prisma);
    await verifiedNumberRepository.createVerifiedNumber({
      userId,
      teamId,
      phoneNumber,
    });
    return true;
  }
  return false;
};
