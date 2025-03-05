import type { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { defaultResponder, defaultHandler } from "@calcom/lib/server";

const DIRECTUS_BASE_URL = "https://painel.yinflow.life/items";
const DIRECTUS_TOKEN = process.env.NEXT_PUBLIC_DIRECTUS_TOKEN || "";

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const session = await getServerSession({ req, res });
  /* To mimic API behavior and comply with types */
  req.userId = session?.user?.id || -1;
  const calUserId = req.query.calUserId as string;

  try {
    const response = await fetch(
      `${DIRECTUS_BASE_URL}/pro_professionals?filter[cal_user_id][_eq]=${calUserId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${DIRECTUS_TOKEN}`,
        },
      }
    );

    return await response.json();
  } catch {
    throw new Error("Error fetching pro_professionals from Directus");
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(handler) }),
});
