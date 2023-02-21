import type { NextApiRequest, NextApiResponse } from "next";

import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { getSession } from "@calcom/lib/auth";
import { defaultResponder, defaultHandler } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const session = await getSession({ req });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  return await handleCancelBooking(req, res);
}

export default defaultHandler({
  DELETE: Promise.resolve({ default: defaultResponder(handler) }),
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
