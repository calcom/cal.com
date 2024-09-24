/* Schedule any workflow reminder that falls within 72 hours for email */
import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import dayjs from "@calcom/dayjs";
import { createTwilioClient } from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { addCredits } from "@calcom/features/ee/workflows/lib/smsCredits/smsCreditsUtils";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

const twilioClient = createTwilioClient();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authToken = process.env.TWILIO_TOKEN;

  const twilioSignature = req.headers["x-twilio-signature"];
  const url = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/twilio/statusCallback`;

  if (typeof twilioSignature === "string") {
    const valid = twilio.validateRequest(authToken ?? "", twilioSignature, url, req.body);

    if (valid) {
      const messageStatus = req.body.MessageStatus;
      const { userId, teamId } = req.query;

      if (messageStatus === "sent") {
        const parsedUserId = userId ? (Array.isArray(userId) ? Number(userId[0]) : Number(userId)) : null;
        const parsedTeamId = teamId ? (Array.isArray(teamId) ? Number(teamId[0]) : Number(teamId)) : null;

        const payingTeam = await addCredits(req.body.To, parsedUserId, parsedTeamId); //todo: test if to phone number is in body
        if (payingTeam) {
          return res
            .status(200)
            .send(`Credits added to teamId: ${payingTeam.teamId} (userId: ${req.body.userId}) `);
        } else {
          return res.status(200).send(`Credit limit was already reached`);
        }
      }
      if (messageStatus === "delivered") {
        const { teamToCharge } = req.query;

        const teamtoChargeId = teamToCharge
          ? Array.isArray(teamToCharge)
            ? Number(teamToCharge[0])
            : Number(teamToCharge)
          : null;

        if (!teamtoChargeId && (userId || teamId)) {
          // todo: find the team to charge
        }

        if (teamtoChargeId) {
          const teamCredits = await prisma.smsCreditCount.findFirst({
            where: {
              id: teamtoChargeId,
              month: dayjs().subtract(1, "day").utc().startOf("month").toDate(),
            },
            select: {
              id: true,
              team: {
                select: {
                  smsOverageLimit: true,
                },
              },
              overageCharges: true,
            },
          });

          const costsString = (await twilioClient.messages(req.body.MessageSid).fetch()).price;

          const costs = Math.abs(parseFloat(costsString));

          if (teamCredits) {
            //if I don't get teamToCharge in then i also need to first check if user still has money left
            const totalCharged = teamCredits.overageCharges + costs;

            if (totalCharged < teamCredits.team.smsOverageLimit) {
              await prisma.smsCreditCount.update({
                where: {
                  id: teamCredits.id,
                },
                data: {
                  overageCharges: {
                    increment: costs,
                  },
                },
              });
            } else {
              await prisma.smsCreditCount.update({
                where: {
                  id: teamCredits.id,
                },
                data: {
                  limitReached: true,
                },
              });
            }
          }
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
