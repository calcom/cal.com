import type { NextApiRequest } from "next";

import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { getSession } from "@calcom/lib/auth";
import { defaultResponder } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }) {
  const session = await getSession({ req });
  /* To mimic API behavior */
  req.userId = session?.user?.id;
  return await handleCancelBooking(req);
}

export default defaultResponder(handler);
