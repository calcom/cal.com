import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import { chargeCredits } from "@calcom/features/ee/billing/lib/credits";
import { createTwilioClient } from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

const twilioClient = createTwilioClient();

/*
  Twilio status callback: creates expense log when sms is delivered or undelivered
*/
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authToken = process.env.TWILIO_TOKEN;
  const twilioSignature = req.headers["x-twilio-signature"];
  const baseUrl = `https://f091-93-83-143-142.ngrok-free.app/api/twilio/webhook`;

  const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
  const url = queryParams ? `${baseUrl}?${queryParams}` : baseUrl;

  if (typeof twilioSignature === "string") {
    const valid = twilio.validateRequest(authToken ?? "", twilioSignature, url, req.body);
    if (valid) {
      const messageStatus = req.body.MessageStatus;
      const { userId, teamId, bookingUid } = req.query;

      if (messageStatus === "delivered" || messageStatus === "undelivered") {
        console.log("message delievered ");
        const phoneNumber = await twilioClient.lookups.v2.phoneNumbers(req.body.To).fetch();

        const parsedTeamId = !!teamId ? Number(teamId) : undefined;

        const parsedUserId = !!userId ? Number(userId) : undefined;

        const parsedBookingUid = bookingUid as string;
        const smsSid = req.body.SmsSid;
        if (!parsedUserId && !parsedTeamId) {
          return res.status(401).send("Team or user id is required");
        }

        if (!IS_SMS_CREDITS_ENABLED) {
          await chargeCredits({
            credits: 0,
            teamId: parsedTeamId,
            userId: parsedUserId,
            bookingUid: parsedBookingUid,
            smsSid,
          });
          return res.status(200).send(`SMS credits are not enabled. Credits set to 0`);
        }

        if (phoneNumber.countryCode === "US" || phoneNumber.countryCode === "CA") {
          // SMS to US and CA are free on a team plan
          let teamIdToCharge = parsedTeamId;

          if (!teamIdToCharge && parsedUserId) {
            const teamMembership = await prisma.membership.findFirst({
              where: {
                userId: parsedUserId,
                accepted: true,
              },
            });

            teamIdToCharge = teamMembership?.teamId;
          }

          if (teamIdToCharge) {
            await chargeCredits({
              teamId: teamIdToCharge,
              bookingUid: parsedBookingUid,
              smsSid,
              credits: 0,
            });
            return res.status(200).send(`SMS to US and CA are free on a team plan. Credits set to 0`);
          }
        }

        let orgId;

        if (parsedTeamId) {
          const team = await prisma.team.findUnique({
            where: {
              id: parsedTeamId,
            },
          });
          orgId = team?.isOrganization ? team.id : undefined;
        }

        if (!orgId) {
          orgId = await getOrgIdFromMemberOrTeamId({
            memberId: parsedUserId,
            teamId: parsedTeamId,
          });
        }

        if (orgId) {
          await chargeCredits({ teamId: orgId, bookingUid: parsedBookingUid, smsSid, credits: 0 });

          return res.status(200).send(`SMS are free for organziations. Credits set to 0`);
        }

        // todo: make reusable function in twilioProvider
        const message = await twilioClient.messages(smsSid).fetch();

        const twilioPrice = message.price ? parseFloat(message.price) : 0; // todo: test this if price is not available

        const price = twilioPrice * 1.8;
        const credits = price * 100 * -1; // todo: if price is given this should be at least 1 credit

        const billingInfo = await chargeCredits({
          credits,
          teamId: parsedTeamId,
          userId: parsedUserId,
          smsSid,
          bookingUid: parsedBookingUid,
        });

        if (billingInfo) {
          return res
            .status(200)
            .send(
              `Expense log with ${credits ? credits : "no"} credits created for ${
                billingInfo.teamId ? `teamId ${billingInfo.teamId}` : `userId: ${billingInfo.userId}`
              }`
            );
        }
        // this should never happen - even when out of credits we still charge a team/user
        return res.status(500).send("No team or users found to be charged");
      }
      return res.status(200).send(`SMS not yet delivered/undelivered`);
    }
  }
  return res.status(401).send("Missing or invalid Twilio signature");
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
