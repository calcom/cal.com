import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { IS_SMS_CREDITS_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

const log = logger.getSubLogger({ prefix: ["[AutoTopUpMonitor]"] });

async function postHandler(req: NextRequest) {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (!IS_SMS_CREDITS_ENABLED) {
    return NextResponse.json({ ok: true, message: "SMS credits not enabled" });
  }

  const autoTopUpBalances = await prisma.creditBalance.findMany({
    where: {
      autoTopUpEnabled: true,
      autoTopUpThreshold: { not: null },
      autoTopUpAmount: { not: null },
    },
    select: {
      id: true,
      teamId: true,
      userId: true,
      additionalCredits: true,
      autoTopUpThreshold: true,
      autoTopUpAmount: true,
    },
  });

  let triggeredCount = 0;
  const { CreditService } = await import("@calcom/features/ee/billing/credit-service");
  const creditService = new CreditService();

  await Promise.allSettled(
    autoTopUpBalances.map(async (balance) => {
      try {
        const allCredits = await creditService.getAllCredits({
          teamId: balance.teamId,
          userId: balance.userId,
        });

        const totalCredits = allCredits.totalRemainingMonthlyCredits + allCredits.additionalCredits;

        const result = await creditService.checkAndTriggerAutoTopUp({
          teamId: balance.teamId,
          userId: balance.userId,
          currentBalance: totalCredits,
        });

        if (result?.triggered) {
          triggeredCount++;
          log.info("Auto top-up triggered", {
            teamId: balance.teamId,
            userId: balance.userId,
            amount: result.amount,
          });
        }
      } catch (error) {
        log.error("Failed to process auto top-up", error, {
          balanceId: balance.id,
          teamId: balance.teamId,
          userId: balance.userId,
        });
      }
    })
  );

  return NextResponse.json({
    ok: true,
    checked: autoTopUpBalances.length,
    triggered: triggeredCount,
  });
}

export const POST = defaultResponderForAppDir(postHandler);
