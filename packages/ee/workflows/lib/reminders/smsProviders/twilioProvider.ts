import twilio from "twilio";

let TWILIO_SID, TWILIO_TOKEN, TWILIO_MESSAGING_SID: string, client: twilio.Twilio;
// Only assign the API keys if they exist in .env
if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_MESSAGING_SID) {
  TWILIO_SID = process.env.TWILIO_SID;
  TWILIO_TOKEN = process.env.TWILIO_TOKEN;
  TWILIO_MESSAGING_SID = process.env.TWILIO_MESSAGING_SID;

  client = twilio(TWILIO_SID, TWILIO_TOKEN);
} else {
  console.error("Twilio credentials are missing from the .env file");
}

export const sendSMS = async (phoneNumber: string, body: string) => {
  const response = await client.messages.create({
    body: body,
    messagingServiceSid: TWILIO_MESSAGING_SID,
    to: phoneNumber,
  });

  return response;
};

export const scheduleSMS = async (phoneNumber: string, body: string, scheduledDate: Date) => {
  const response = await client.messages.create({
    body: body,
    messagingServiceSid: TWILIO_MESSAGING_SID,
    to: phoneNumber,
    scheduleType: "fixed",
    sendAt: scheduledDate,
  });

  return response;
};

export const cancelSMS = async (referenceId: string) => {
  await client.messages(referenceId).update({ status: "canceled" });
};
