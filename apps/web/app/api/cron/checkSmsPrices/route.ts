import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import dayjs from "@calcom/dayjs";
import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";

async function postHandler(req: NextRequest) {
  const apiKey = req.headers.get("authorization") || req.nextUrl.searchParams.get("apiKey");

  if (process.env.CRON_API_KEY !== apiKey) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
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
        const credits = await twilio.getCreditsForSMS(log.smsSid);

        if (!credits) {
          // price not yet available
          return;
        }

        await prisma.creditExpenseLog.update({
          where: { id: log.id },
          data: { credits },
        });

        pricesUpdated++;

        // await handleLowCreditBalance;
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
