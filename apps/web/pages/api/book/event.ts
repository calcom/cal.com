import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";
import { BotDetectionService } from "@calcom/features/bot-detection";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { checkCfTurnstileToken } from "@calcom/lib/server/checkCfTurnstileToken";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import prisma from "@calcom/prisma";
import { CreationSource } from "@calcom/prisma/enums";

async function handler(req: NextApiRequest & { userId?: number }) {
  const userIp = getIP(req);

  if (process.env.NEXT_PUBLIC_CLOUDFLARE_USE_TURNSTILE_IN_BOOKER === "1") {
    await checkCfTurnstileToken({
      token: req.body["cfToken"] as string,
      remoteIp: userIp,
    });
  }

  // Check for bot detection using feature flag
  const featuresRepository = new FeaturesRepository(prisma);
  const eventTypeRepository = new EventTypeRepository(prisma);
  const botDetectionService = new BotDetectionService(featuresRepository, eventTypeRepository);

  await botDetectionService.checkBotDetection({
    eventTypeId: req.body.eventTypeId,
    headers: req.headers,
  });

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: piiHasher.hash(userIp),
  });

  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */
  req.body = {
    ...req.body,
    creationSource: CreationSource.WEBAPP,
  };

  const regularBookingService = getRegularBookingService();
  const booking = await regularBookingService.createBooking({
    bookingData: req.body,
    bookingMeta: {
      userId: session?.user?.id || -1,
      hostname: req.headers.host || "",
      forcedSlug: req.headers["x-cal-force-slug"] as string | undefined,
    },
  });
  // const booking = await createBookingThroughFactory();
  return booking;

  //  To be added in the follow-up PR
  // async function createBookingThroughFactory() {
  //   console.log("Creating booking through factory");
  //   const regularBookingService = getRegularBookingService();

  //   const booking = await regularBookingService.createBooking({
  //     bookingData: req.body,
  //     bookingMeta: {
  //       userId: session?.user?.id || -1,
  //       hostname: req.headers.host || "",
  //       forcedSlug: req.headers["x-cal-force-slug"] as string | undefined,
  //     },
  //   });
  //   return booking;
  // }
}

export default defaultResponder(handler, "/api/book/event");
