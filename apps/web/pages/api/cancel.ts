import type { NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { defaultResponder, defaultHandler } from "@calcom/lib/server";

async function handler(req: NextApiRequest & { userId?: number }) {
  const session = await getServerSession({ req });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  return await handleCancelBooking(req);
}

export default defaultHandler({
  DELETE: Promise.resolve({ default: defaultResponder(handler) }),
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
