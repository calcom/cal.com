import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import type { TraceContext } from "@calcom/lib/tracing";
import { CreationSource } from "@calcom/prisma/enums";

type TracedRequest = NextApiRequest & {
  userId?: number;
  traceContext?: TraceContext;
};

async function handler(req: TracedRequest) {
  const userIp = getIP(req);

  // Enrich the trace context with request-specific details
  if (req.traceContext) {
    req.traceContext.userIp = "<redacted>";
    req.traceContext.eventTypeId = req.body?.eventTypeId;
  }

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: req.body["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });

  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */
  req.body = {
    ...req.body,
    creationSource: CreationSource.WEBAPP,
  };

  if (!req.traceContext) {
    throw new Error("Trace context is required");
  }

  const booking = await handleNewBooking({
    bookingData: req.body,
    userId: session?.user?.id || -1,
    hostname: req.headers.host || "",
    forcedSlug: req.headers["x-cal-force-slug"] as string | undefined,
    traceContext: req.traceContext,
  });

  return booking;
}

export default defaultResponder(handler, "/api/book/event");
