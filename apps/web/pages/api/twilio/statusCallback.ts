/* Schedule any workflow reminder that falls within 72 hours for email */
import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import { addCredits } from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { defaultHandler } from "@calcom/lib/server";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authToken = process.env.TWILIO_TOKEN;

  const twilioSignature = req.headers["x-twilio-signature"];
  const url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/twilio/statusCallback`;

  if (typeof twilioSignature === "string") {
    const valid = twilio.validateRequest(authToken ?? "", twilioSignature, url, req.body);

    if (valid) {
      const messageStatus = req.body.MessageStatus;
      if (messageStatus === "sent") {
        const { userId, teamId } = req.query;

        const parsedUserId = userId ? (Array.isArray(userId) ? Number(userId[0]) : Number(userId)) : null;
        const parsedTeamId = teamId ? (Array.isArray(teamId) ? Number(teamId[0]) : Number(teamId)) : null;

        const payingTeam = await addCredits("", parsedUserId, parsedTeamId);
        if (payingTeam) {
          return res
            .status(200)
            .send(`Credits added to teamId: ${payingTeam.teamId} (userId: ${req.body.userId}) `);
        } else {
          return res.status(200).send(`Credit limit was already reached`);
        }
      }
    } else {
      res.status(401).send("Missing or invalid Twilio signature");
    }
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
