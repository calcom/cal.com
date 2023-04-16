import type { NextApiRequest, NextApiResponse } from "next";

import { getSlimServerSession } from "@calcom/features/auth/lib/getSlimServerSession";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }, _res: NextApiResponse) {
  const session = await getSlimServerSession({ req });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const booking = await handleNewBooking(req, {
    isNotAnApiCall: true,
  });
  return booking;
}

export default defaultResponder(handler);
