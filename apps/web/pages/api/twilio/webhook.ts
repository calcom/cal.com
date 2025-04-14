import type { NextApiRequest, NextApiResponse } from "next";
import twilio from "twilio";

import { getEntityToCharge } from "@calcom/features/ee/billing/lib/credits";
import { createTwilioClient } from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import getOrgIdFromMemberOrTeamId from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";

const twilioClient = createTwilioClient();

async function createExpenseLog(props: {
  bookingUid: string;
  smsSid: string;
  teamId?: number;
  userId?: number;
  credits?: number;
  creditType?: CreditType;
}) {
  const { credits, creditType, bookingUid, smsSid, teamId, userId } = props;

  if (!teamId && !userId) return;

  const creditBalance = await prisma.creditBalance.upsert({
    where: { teamId: teamId, userId: !teamId ? userId : undefined },
    create: { teamId: teamId, userId: !teamId ? userId : undefined },
    update: {},
  });

  return prisma.creditExpenseLog.create({
    data: {
      creditBalanceId: creditBalance.id,
      credits,
      creditType,
      date: new Date(),
      bookingUid,
      smsSid,
    },
  });
}

/*
  Twilio status callback: creates expense log when sms is delivered or undelivered
*/
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authToken = process.env.TWILIO_TOKEN;
  const twilioSignature = req.headers["x-twilio-signature"];
  const baseUrl = `${process.env.NEXT_PUBLIC_WEBAPP_URL}/api/twilio/webhook`;

  const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
  const url = queryParams ? `${baseUrl}?${queryParams}` : baseUrl;

  if (typeof twilioSignature === "string") {
    const valid = twilio.validateRequest(authToken ?? "", twilioSignature, url, req.body);
    if (valid) {
      const messageStatus = req.body.MessageStatus;
      const { userId, teamId, bookingUid } = req.query;

      if (messageStatus === "delivered" || messageStatus === "undelivered") {
        const phoneNumber = await twilioClient.lookups.v2.phoneNumbers(req.body.To).fetch();

        const parsedTeamId = teamId ? (Array.isArray(teamId) ? Number(teamId[0]) : Number(teamId)) : null;
        const parsedUserId = userId ? (Array.isArray(userId) ? Number(userId[0]) : Number(userId)) : null;
        const parsedBookingUid = bookingUid as string;
        const smsSid = req.body.SmsSid;

        if (!parsedUserId && !parsedTeamId) {
          return res.status(401).send("Team or user id is required");
        }

        if (!IS_SMS_CREDITS_ENABLED) {
          await createExpenseLog({
            teamId: teamIdToCharge,
            bookingUid: parsedBookingUid,
            smsSid,
            credits: 0,
            creditType: CreditType.MONTHLY,
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

            teamIdToCharge = teamMembership?.teamId ?? null;
          }

          if (teamIdToCharge) {
            await createExpenseLog({
              teamId: teamIdToCharge,
              bookingUid: parsedBookingUid,
              smsSid,
              credits: 0,
              creditType: CreditType.MONTHLY,
            });
            return res.status(200).send(`SMS to US and CA are free on a team plan. Credits set to 0`);
          }
        }

        let orgId = null;

        if (parsedTeamId) {
          const team = await prisma.team.findUnique({
            where: {
              id: parsedTeamId,
            },
          });
          orgId = team?.isOrganization ? team.id : null;
        }

        if (!orgId) {
          orgId = await getOrgIdFromMemberOrTeamId({
            memberId: parsedUserId,
            teamId: parsedTeamId,
          });
        }

        if (orgId) {
          await createExpenseLog({
            teamId: orgId,
            bookingUid: parsedBookingUid,
            smsSid,
            credits: 0,
            creditType: CreditType.MONTHLY,
          });
          return res.status(200).send(`SMS are free for organziations. Credits set to 0`);
        }

        const message = await twilioClient.messages(smsSid).fetch();

        const twilioPrice = message.price ? parseFloat(message.price) : 0; // todo: test this if price is not available

        const price = twilioPrice * 1.8;
        const credits = price * 100 * -1;

        // find who will be charged and create expense log
        const billingInfo = await getEntityToCharge({
          credits,
          userId: parsedUserId,
          teamId: parsedTeamId,
        });

        if (billingInfo) {
          await createExpenseLog({
            teamId: billingInfo.teamId,
            userId: billingInfo.userId,
            bookingUid: parsedBookingUid,
            smsSid,
            // set to undefined if price is not yet available, cron job will handle it
            credits: credits || undefined,
            creditType: CreditType.MONTHLY,
          });

          if (credits) {
            //await handleLowCreditBalance();
          }

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
