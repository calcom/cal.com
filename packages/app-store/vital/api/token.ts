import { VitalClient } from "@tryvital/vital-node";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";

const client = new VitalClient({
  client_id: process.env.VITAL_CLIENT_ID || "",
  client_secret: process.env.VITAL_CLIENT_SECRET || "",
  environment: "sandbox",
});

/**
 * This is will generate a user token for a client_user_id`
 * @param req
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user id
  const client_user_id = req.session?.user?.id;
  if (!client_user_id) {
    res.status(400).json({ error: "No user id" });
  }

  // Create a user
  let user;
  try {
    user = await client.User.create(`cal_${client_user_id}`);
  } catch (e) {
    user = await client.User.resolve(`cal_${client_user_id}`);
  }
  try {
    const token = await client.Link.create(
      user?.user_id,
      undefined,
      WEBAPP_URL + "/api/integrations/vital/callback"
    );
    return res.status(200).json({ token: token.link_token });
  } catch (e) {
    return res.status(400).json({ error: JSON.stringify(e) });
  }
}
