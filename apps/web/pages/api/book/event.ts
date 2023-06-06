import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { defaultResponder } from "@calcom/lib/server";
async function handleNewBookingWrapper(req: NextApiRequest, options: { isNotAnApiCall: boolean }) {
  return handleNewBooking(req, options);
}

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
    const booking = await handleNewBookingWrapper(req, {
    isNotAnApiCall: true,
  });
  return booking;
}

export default defaultResponder(handler);
