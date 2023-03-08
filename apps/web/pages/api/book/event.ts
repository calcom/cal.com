import type { NextApiRequest, NextApiResponse } from "next";
import { AUTH_OPTIONS } from "pages/api/auth/[...nextauth]";

import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { getServerSession } from "@calcom/lib/auth";
import { defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const session = await getServerSession({ req, res, authOptions: AUTH_OPTIONS });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const booking = await handleNewBooking(req, {
    isNotAnApiCall: true,
  });
  return booking;
}

export default defaultResponder(handler);
