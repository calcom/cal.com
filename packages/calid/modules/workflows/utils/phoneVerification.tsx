import prisma from "@calcom/prisma";

import * as twilio from "../providers/twilio";

const initiatePhoneValidation = async (contactNumber: string): Promise<any> => {
  return twilio.sendVerificationCode(contactNumber);
};

const confirmNumberOwnership = async (
  contactNumber: string,
  validationToken: string,
  userIdentifier?: number,
  organizationId?: number
): Promise<boolean> => {
  const hasRequiredIdentifier = userIdentifier || organizationId;
  if (!hasRequiredIdentifier) return true;

  const authenticationResult = await twilio.verifyNumber(contactNumber, validationToken);
  const isValidationSuccessful = authenticationResult === "approved";

  if (isValidationSuccessful) {
    await prisma.verifiedNumber.create({
      data: {
        userId: userIdentifier,
        calIdTeamId: organizationId,
        phoneNumber: contactNumber,
      },
    });
    return true;
  }

  return false;
};

export const sendVerificationCode = initiatePhoneValidation;
export const verifyPhoneNumber = confirmNumberOwnership;
