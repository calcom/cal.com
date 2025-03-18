import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import { payCredits } from "@calcom/features/ee/billing/lib/credits";
import { createTwilioClient } from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { defaultHandler } from "@calcom/lib/server";

const twilioClient = createTwilioClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authToken = process.env.TWILIO_TOKEN;

  const twilioSignature = req.headers["x-twilio-signature"];
  const baseUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/twilio/statusCallback`;

  const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
  const url = queryParams ? `${baseUrl}?${queryParams}` : baseUrl;

  if (typeof twilioSignature === "string") {
    const valid = twilio.validateRequest(authToken ?? "", twilioSignature, url, req.body);
    if (valid) {
      const messageStatus = req.body.MessageStatus;
      const { userId, teamId, bookingUid } = req.query;

      if (messageStatus === "sent") {
        const parsedUserId = userId ? (Array.isArray(userId) ? Number(userId[0]) : Number(userId)) : null;
        const parsedTeamId = teamId ? (Array.isArray(teamId) ? Number(teamId[0]) : Number(teamId)) : null;
        const parsedBookingUid = bookingUid
          ? Array.isArray(bookingUid)
            ? Number(bookingUid[0])
            : Number(bookingUid)
          : null;

        if (!parsedUserId && !parsedTeamId) {
          return res.status(401).send("Team or user id is required");
        }

        // calculate credit amount

        const paymentDetails = await payCredits({
          quantity: 10,
          details: `SMS: ${parsedBookingUid}`,
          userId: parsedUserId,
          teamId: parsedTeamId,
        });

        handleLowCreditBalance({
          userId: parsedUserId,
          teamId: parsedTeamId,
          remainingCredits: paymentDetails.remainingCredits,
        });

        return res
          .status(200)
          .send(
            `Credits added to ${
              paymentDetails?.teamId ? `teamId: ${paymentDetails?.teamId}` : `userId: ${parsedUserId}`
            }`
          );
      }
      return res.status(200).send(`SMS not yet delivered`);
    }
  }
  return res.status(401).send("Missing or invalid Twilio signature");
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
