import type { NextApiRequest } from "next";

import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import { getSession } from "@calcom/lib/auth";
import { defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }) {
  const session = await getSession({ req });
  /* To mimic API behavior */
  req.userId = session?.user?.id;
  const booking = await handleNewBooking(req);
  return booking;
}

export default defaultResponder(handler);
