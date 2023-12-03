// ASHELY TANG
import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
// You'll need to implement this
import { defaultResponder, defaultHandler } from "@calcom/lib/server";

import { addToWaitlist, removeFromWaitlist } from "./waitlistHandler";

async function waitlistHandler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const session = await getServerSession({ req, res });
  req.userId = session?.user?.id || -1;

  switch (req.method) {
    case "POST":
      // Logic to add to waitlist
      return await addToWaitlist(req);
    case "DELETE":
      // Logic to remove from waitlist
      return await removeFromWaitlist(req);
    default:
      res.status(405).end(); // Method Not Allowed
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(waitlistHandler) }),
  DELETE: Promise.resolve({ default: defaultResponder(waitlistHandler) }),
});
