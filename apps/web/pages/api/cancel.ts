import type { NextApiRequest, NextApiResponse } from "next";
import { AUTH_OPTIONS } from "pages/api/auth/[...nextauth]";

import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { getServerSession } from "@calcom/lib/auth";
import { defaultResponder, defaultHandler } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const session = await getServerSession({ req, res, authOptions: AUTH_OPTIONS });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  return await handleCancelBooking(req);
}

export default defaultHandler({
  DELETE: Promise.resolve({ default: defaultResponder(handler) }),
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
