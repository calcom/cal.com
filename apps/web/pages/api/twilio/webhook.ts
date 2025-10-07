import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { IS_SMS_CREDITS_ENABLED, WEBAPP_URL } from "@calcom/lib/constants";
import { getPublishedOrgIdFromMemberOrTeamId } from "@calcom/lib/getOrgIdFromMemberOrTeamId";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import prisma from "@calcom/prisma";
import { CreditUsageType } from "@calcom/prisma/enums";

const InputSchema = z.object({
  userId: z
    .string()
    .optional()
    .transform((val) => {
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }),
  teamId: z
    .string()
    .optional()
    .transform((val) => {
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }),
  bookingUid: z.string().optional(),
});

/*
  Twilio status callback: creates expense log when sms is delivered or undelivered
*/
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const signature = req.headers["x-twilio-signature"];
  const baseUrl = `${WEBAPP_URL}/api/twilio/webhook`;

  const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
  const requestUrl = queryParams ? `${baseUrl}?${queryParams}` : baseUrl;

  if (typeof signature !== "string") {
    return res.status(401).send("Missing Twilio signature");
  }

  const isSignatureValid = await twilio.validateWebhookRequest({
    requestUrl,
    signature,
    params: req.body,
  });

  if (!isSignatureValid) {
    return res.status(401).send("Invalid Twilio signature");
  }

  const messageStatus = req.body.MessageStatus;

  if (messageStatus !== "delivered" && messageStatus !== "undelivered") {
    return res.status(200).send(`SMS not yet delivered/undelivered`);
  }

  if (!IS_SMS_CREDITS_ENABLED) {
    return res.status(200).send(`SMS credits are not enabled.`);
  }

  const countryCode = await twilio.getCountryCodeForNumber(req.body.To);

  const smsSid = req.body.SmsSid;

  const {
    userId: parsedUserId,
    teamId: parsedTeamId,
    bookingUid: parsedBookingUid,
  } = InputSchema.parse(req.query);

  if (!parsedUserId && !parsedTeamId) {
    return res.status(401).send("Team or user id is required");
  }
  const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
  const creditService = new CreditService();

  if (countryCode === "US" || countryCode === "CA") {
    // SMS to US and CA are free for teams
    let teamIdToCharge = parsedTeamId;

    if (!teamIdToCharge && parsedUserId) {
      const teamMembership = await prisma.membership.findFirst({
        where: {
          userId: parsedUserId,
          accepted: true,
          team: {
            slug: { not: null },
          },
        },
        select: {
          teamId: true,
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
        creditFor: CreditUsageType.SMS,
      });

      return res.status(200).send(`SMS to US and CA are free for teams. Credits set to 0`);
    }
  }

  let orgId;

  if (parsedTeamId) {
    const team = await prisma.team.findUnique({
      where: {
        id: parsedTeamId,
      },
      select: {
        isOrganization: true,
        id: true,
      },
    });
    orgId = team?.isOrganization ? team.id : undefined;
  }

  if (!orgId) {
    orgId = await getPublishedOrgIdFromMemberOrTeamId({
      ...(!parsedTeamId ? { memberId: parsedUserId } : {}),
      teamId: parsedTeamId,
    });
  }

  if (orgId) {
    await creditService.chargeCredits({
      teamId: orgId,
      bookingUid: parsedBookingUid,
      smsSid,
      credits: 0,
      creditFor: CreditUsageType.SMS,
    });

    return res.status(200).send(`SMS are free for organizations. Credits set to 0`);
  }

  const { price, numSegments } = await twilio.getMessageInfo(smsSid);

  const credits = price ? creditService.calculateCreditsFromPrice(price) : null;

  const chargedUserOrTeamId = await creditService.chargeCredits({
    credits,
    teamId: parsedTeamId,
    userId: parsedUserId,
    smsSid,
    bookingUid: parsedBookingUid,
    smsSegments: numSegments ?? undefined,
    creditFor: CreditUsageType.SMS,
  });

  if (chargedUserOrTeamId) {
    return res.status(200).send(
      `Expense log with ${credits ? credits : "no"} credits created for
             ${
               chargedUserOrTeamId.teamId
                 ? `teamId ${chargedUserOrTeamId.teamId}`
                 : `userId ${chargedUserOrTeamId.userId}`
             }`
    );
  }
  // this should never happen - even when out of credits we still charge a team
  return res.status(500).send("No team or users found to be charged");
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
