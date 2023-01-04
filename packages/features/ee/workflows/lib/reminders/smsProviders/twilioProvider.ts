import TwilioClient from "twilio";

declare global {
  // eslint-disable-next-line no-var
  var twilio: TwilioClient.Twilio | undefined;
}

export const twilio =
  globalThis.twilio ||
  (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_MESSAGING_SID)
    ? TwilioClient(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)
    : undefined;

if (process.env.NODE_ENV !== "production") {
  globalThis.twilio = twilio;
}

function assertTwilio(twilio: TwilioClient.Twilio | undefined): asserts twilio is TwilioClient.Twilio {
  if (!twilio) throw new Error("Twilio credentials are missing from the .env file");
}

export const sendSMS = async (phoneNumber: string, body: string, sender: string) => {
  assertTwilio(twilio);
  const response = await twilio.messages.create({
    body: body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: phoneNumber,
    from: sender ? sender : process.env.TWILIO_PHONE_NUMBER,
  });

  return response;
};

export const scheduleSMS = async (phoneNumber: string, body: string, scheduledDate: Date, sender: string) => {
  assertTwilio(twilio);
  const response = await twilio.messages.create({
    body: body,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SID,
    to: phoneNumber,
    scheduleType: "fixed",
    sendAt: scheduledDate,
    from: sender ? sender : process.env.TWILIO_PHONE_NUMBER,
  });

  return response;
};

export const cancelSMS = async (referenceId: string) => {
  assertTwilio(twilio);
  await twilio.messages(referenceId).update({ status: "canceled" });
};

export const sendVerificationCode = async (phoneNumber: string) => {
  assertTwilio(twilio);
  if (process.env.TWILIO_VERIFY_SID) {
    await twilio.verify
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phoneNumber, channel: "sms" });
  }
};

export const verifyNumber = async (phoneNumber: string, code: string) => {
  assertTwilio(twilio);
  if (process.env.TWILIO_VERIFY_SID) {
    try {
      const verification_check = await twilio.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks.create({ to: phoneNumber, code: code });
      return verification_check.status;
    } catch (e) {
      return "failed";
    }
  }
};
