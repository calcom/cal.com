import prisma from "@calcom/prisma";

import * as twilio from "./smsProviders/twilioProvider";

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

  // Check if the phone number is an Australian number
  const isAustralianNumber =
  phoneNumber.startsWith("+61493") ||
  phoneNumber.startsWith("+610493") ||
  phoneNumber.match(/^\+61[2378]/);

  // Check if the phone number has an 8 after the 3
  const hasEightAfterThree = phoneNumber.includes("+6138");
  
  // If the verification is approved and the number is Australian or has an 8 after 3
  if (verificationStatus === "approved" && (isAustralianNumber || hasEightAfterThree)) {
   // Save the verified number to the database 
    await prisma.verifiedNumber.create({
      data: {
        userId,
        teamId,
        phoneNumber,
      },
    });
    return true;
  }
  return false;
};
