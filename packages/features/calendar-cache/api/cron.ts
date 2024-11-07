import type { NextRequest } from "next/server";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder.appDir";

const validateRequest = (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const apiKey = searchParams.get("apiKey") || req.headers.get("authorization");
  if (!apiKey || ![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(apiKey)) {
    throw new HttpError({ statusCode: 401, message: "Unauthorized" });
  }
};

// This cron is used to activate and renew calendar subcriptions
export const GET = defaultResponder(async (request: NextRequest) => {
  validateRequest(request);
  // const calendarCache = await CalendarCache.init();
  // calendarCache.re();

  return { success: true };
});
