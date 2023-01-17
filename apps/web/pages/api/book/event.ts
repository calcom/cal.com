import type { NextApiRequest } from "next";

import { getSession } from "@calcom/features/auth/lib";
import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }) {
  const session = await getSession({ req });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const booking = await handleNewBooking(req);
  return booking;
}

export default defaultResponder(handler);
