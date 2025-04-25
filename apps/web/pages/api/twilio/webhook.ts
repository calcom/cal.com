import type { NextApiRequest, NextApiResponse } from "next";

import { CreditService } from "@calcom/features/ee/billing/credit-service";
import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { IS_SMS_CREDITS_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

/*
  Twilio status callback: creates expense log when sms is delivered or undelivered
*/
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const signature = req.headers["x-twilio-signature"];
  const baseUrl = `${WEBAPP_URL}/api/twilio/webhook`;

  const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
  const requestUrl = queryParams ? `${baseUrl}?${queryParams}` : baseUrl;

  if (typeof signature === "string") {
    const isSignatureValid = await twilio.validateWebhookRequest({
      requestUrl,
      signature,
      params: req.body,
    });
    if (isSignatureValid) {
      const messageStatus = req.body.MessageStatus;
      const { userId, teamId, bookingUid } = req.query;

      if (messageStatus === "delivered" || messageStatus === "undelivered") {
        if (!IS_SMS_CREDITS_ENABLED) {
          return res.status(200).send(`SMS credits are not enabled.`);
        }

        const countryCode = await twilio.getCountryCodeForNumber(req.body.To);

        const parsedTeamId = !!teamId ? Number(teamId) : undefined;

        const parsedUserId = !!userId ? Number(userId) : undefined;

        const parsedBookingUid = bookingUid as string;
        const smsSid = req.body.SmsSid;
        if (!parsedUserId && !parsedTeamId) {
          return res.status(401).send("Team or user id is required");
        }

        const creditService = new CreditService();

        if (countryCode === "US" || countryCode === "CA") {
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
            await creditService.chargeCredits({
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
          await creditService.chargeCredits({
            teamId: orgId,
            bookingUid: parsedBookingUid,
            smsSid,
            credits: 0,
          });

          return res.status(200).send(`SMS are free for organziations. Credits set to 0`);
        }

        const credits = await twilio.getCreditsForSMS(smsSid);

        const chargedTeamId = await creditService.chargeCredits({
          credits,
          teamId: parsedTeamId,
          userId: parsedUserId,
          smsSid,
          bookingUid: parsedBookingUid,
        });

        if (teamId) {
          return res.status(200).send(
            `Expense log with ${credits ? credits : "no"} credits created for
                teamId ${chargedTeamId}`
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
