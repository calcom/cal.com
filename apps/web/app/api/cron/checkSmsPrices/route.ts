import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import { CreditService } from "@calcom/features/ee/billing/credit-service";
import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";

async function postHandler(req: NextRequest) {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (!IS_SMS_CREDITS_ENABLED) {
    return NextResponse.json({ ok: true, message: "SMS credits not enabled" });
  }

  const smsLogsWithoutPrice = await prisma.creditExpenseLog.findMany({
    where: {
      credits: null,
      smsSid: {
        not: null,
      },
      date: {
        gte: dayjs().subtract(1, "hour").toDate(),
      },
    },
  });

  let pricesUpdated = 0;

  await Promise.all(
    smsLogsWithoutPrice.map(async (log) => {
      if (!log.smsSid) return;
      try {
        const price = await twilio.getPriceForSMS(log.smsSid);

        const credits = price ? creditService.calculateCreditsFromPrice(price) : null;

        if (!credits) {
          // price not yet available
          return;
        }

        const updatedLog = await prisma.creditExpenseLog.update({
          where: { id: log.id },
          data: { credits },
        });

        const creditBalance = await prisma.creditBalance.update({
          where: { id: updatedLog.creditBalanceId },
          data: {
            additionalCredits: {
              decrement: updatedLog.creditType === CreditType.ADDITIONAL ? credits : 0,
            },
          },
        });

        pricesUpdated++;
        console.log("after update");
        if (!creditBalance.teamId) {
          logger.error("Team id missing in checkSmsPrices");
          return;
        }

        const creditService = new CreditService();

        const teamCredits = await creditService.getAllCreditsForTeam(creditBalance.teamId);
        const remaningMonthlyCredits =
          teamCredits.totalRemainingMonthlyCredits > 0
            ? teamCredits.totalRemainingMonthlyCredits - credits
            : 0;

        await creditService.handleLowCreditBalance({
          teamId: creditBalance.teamId,
          remainingCredits: remaningMonthlyCredits + teamCredits.additionalCredits,
        });
      } catch (err) {
        logger.error(`Failed to fetch/update SMS log ${log.smsSid}. SMS credits set to 0`, err);
        await prisma.creditExpenseLog.update({
          where: { id: log.id },
          data: { credits: 0 }, // to avoid getting this error again, set to 0
        });
      }
    })
  );

  return NextResponse.json({ ok: true, pricesUpdated });
}

export const POST = defaultResponderForAppDir(postHandler);
