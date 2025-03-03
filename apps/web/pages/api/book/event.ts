import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CreationSource } from "@calcom/prisma/enums";

async function handler(req: NextApiRequest & { userId?: number }) {
  const userIp = getIP(req);

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
  req.userId = session?.user?.id || -1;
  req.body = {
    ...req.body,
    creationSource: CreationSource.WEBAPP,
  };

  const booking = await handleNewBooking(req);

  // Appending UTM parameters to the booking URL
  const utmParams = new URLSearchParams({
    utm_source: req.body.utm_source || "default_source", // Default value if not provided
    utm_medium: req.body.utm_medium || "default_medium",
    utm_campaign: req.body.utm_campaign || "default_campaign",
    utm_content: req.body.utm_content || "default_content",
    utm_term: req.body.utm_term || "default_term",
  });

  // Ensuring the booking URL exists and append UTM parameters
  if (booking && booking.url) {
    booking.url = `${booking.url}?${utmParams.toString()}`;
  }

  return booking; // Returning the booking object with the modified URL
}

export default defaultResponder(handler, "/api/book/event");
