import { NextApiRequest } from "next";
import { NextApiResponse } from "next";

import { updateSubscription } from "@calcom/stripe/subscriptions";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const session = await getSession({ req });
    const userId = session?.user?.id || 23;
    const newPlanPriceId = req?.body?.newPlanPriceId;
    if (userId) {
      const result = await updateSubscription({ userId, newPlanPriceId });
      return res.status(200).json(result);
    }
  }
  return res.status(204);
}
