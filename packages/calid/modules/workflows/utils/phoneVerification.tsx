import prisma from "@calcom/prisma";

import * as smsService from "../providers/messaging/dispatcher";

const initiatePhoneValidation = async (contactNumber: string): Promise<any> => {
  return smsService.sendVerificationCode(contactNumber);
};

const confirmNumberOwnership = async (
  contactNumber: string,
  validationToken: string,
  userIdentifier?: number,
  organizationId?: number
): Promise<{
  verifyStatus: boolean;
  status?: string;
  error?: string;
}> => {
  const hasRequiredIdentifier = userIdentifier || organizationId;
  if (!hasRequiredIdentifier)
    return {
      verifyStatus: false,
      error: "Internal Server Error",
    };

  const authenticationResult = await smsService.verifyNumber(contactNumber, validationToken);
  const isValidationSuccessful = authenticationResult.response.status === "approved";

  if (isValidationSuccessful) {
    await prisma.verifiedNumber.create({
      data: {
        userId: userIdentifier,
        calIdTeamId: organizationId,
        phoneNumber: contactNumber,
      },
    });
    return { verifyStatus: true, status: authenticationResult.response.status };
  }

  return {
    verifyStatus: false,
    error: authenticationResult.response.error,
  };
};

export const sendVerificationCode = initiatePhoneValidation;
export const verifyPhoneNumber = confirmNumberOwnership;
