import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { getBookingCreateFactory } from "@calcom/lib/di/containers/BookingCreateFactory";
import getIP from "@calcom/lib/getIP";
import { piiHasher } from "@calcom/lib/server/PiiHasher";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CreationSource } from "@calcom/prisma/enums";

async function handler(req: NextApiRequest & { userId?: number }) {
  const userIp = getIP(req);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: `instant.event-${piiHasher.hash(userIp)}`,
  });

  const session = await getServerSession({ req });
  req.userId = session?.user?.id || -1;
  req.body.creationSource = CreationSource.WEBAPP;

  const bookingCreateFactory = getBookingCreateFactory();
  // TODO: req.body is any type, we should ideally zod parse it
  const booking = await bookingCreateFactory.createInstantBooking({
    bookingData: req.body,
  });

  return booking;
}
export default defaultResponder(handler);
