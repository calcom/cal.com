import dayjs from "@calcom/dayjs";
import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { CreditType } from "@calcom/prisma/enums";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
    select: {
      smsSid: true,
      id: true,
    },
  });

  let pricesUpdated = 0;
  const { CreditService } = await import("@calcom/features/ee/billing/credit-service");

  const creditService = new CreditService();

  await Promise.allSettled(
    smsLogsWithoutPrice.map(async (log) => {
      if (!log.smsSid) return;

      try {
        const { price, numSegments } = await twilio.getMessageInfo(log.smsSid);
        const credits = price ? creditService.calculateCreditsFromPrice(price) : null;
        if (!credits) return;

        const updatedLog = await prisma.creditExpenseLog.update({
          where: { id: log.id },
          data: { credits, smsSegments: numSegments },
          select: {
            creditBalance: {
              select: {
                id: true,
                additionalCredits: true,
                teamId: true,
                userId: true,
              },
            },
            creditType: true,
          },
        });

        if (updatedLog.creditType === CreditType.ADDITIONAL) {
          const decrementValue =
            credits <= updatedLog.creditBalance.additionalCredits
              ? credits
              : updatedLog.creditBalance.additionalCredits;

          await prisma.creditBalance.update({
            where: { id: updatedLog.creditBalance.id },
            data: {
              additionalCredits: {
                decrement: decrementValue,
              },
            },
          });
        }

        if (!updatedLog.creditBalance.teamId && !updatedLog.creditBalance.userId) {
          logger.error(`teamId or userId missing for expense log ${log.id}`);
          return;
        }

        const availableCredits = await creditService.getAllCredits({
          teamId: updatedLog.creditBalance.teamId,
          userId: updatedLog.creditBalance.userId,
        });

        const remainingMonthlyCredits = Math.max(0, availableCredits.totalRemainingMonthlyCredits);

        await creditService.handleLowCreditBalance({
          userId: updatedLog.creditBalance.userId,
          teamId: updatedLog.creditBalance.teamId,
          remainingCredits: remainingMonthlyCredits + availableCredits.additionalCredits,
        });

        pricesUpdated++;
      } catch (err) {
        logger.error(`Failed to process SMS log ${log.smsSid}`, err);
        await prisma.creditExpenseLog.update({
          where: { id: log.id },
          data: { credits: 0 },
        });
      }
    })
  );

  return NextResponse.json({ ok: true, pricesUpdated });
}

export const POST = defaultResponderForAppDir(postHandler);
