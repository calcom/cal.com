import * as twilio from "./smsProviders/twilioProvider";

export const sendVerificationCode = async (phoneNumber: string) => {
  twilio.sendVerificationCode(phoneNumber);
};

export const verifyPhoneNumber = async (phoneNumber: string, code: string) => {
  const verificationStatus = await twilio.verifyNumber(phoneNumber, code);

  console.log(verificationStatus);
};
