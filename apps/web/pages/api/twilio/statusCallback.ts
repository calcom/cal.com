/* Schedule any workflow reminder that falls within 72 hours for email */
import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

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
        console.log("Add credits here");
      }
    } else {
      res.status(401).send("Missing or invalid Twilio signature");
    }
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
