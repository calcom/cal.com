import { Prisma } from "@prisma/client";
import { VitalClient } from "@tryvital/vital-node";
import type { NextApiRequest, NextApiResponse } from "next";

import { VITAL_ENV as vitalEnv } from "@calcom/lib/constants";
import { WEBAPP_URL } from "@calcom/lib/constants";
import prisma from "@calcom/prisma";

const client = new VitalClient({
  client_id: vitalEnv.client_id || "",
  client_secret: vitalEnv.client_secret || "",
  // @ts-ignore
  environment: vitalEnv.mode || "sandbox",
});

/**
 * This is will generate a user token for a client_user_id`
 * @param req
 * @param res
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get user id
  const calcomUserId = req.session?.user?.id;
  if (!calcomUserId) {
    res.status(400).json({ error: "No user id" });
  }

  // Create a user on vital
  let userVital;
  try {
    userVital = await client.User.create(`cal_${calcomUserId}`);
  } catch (e) {
    userVital = await client.User.resolve(`cal_${calcomUserId}`);
  }

  try {
    if (userVital && userVital?.user_id) {
      await prisma.credential.create({
        data: {
          type: "vital_other",
          key: { userVitalId: userVital?.user_id } as unknown as Prisma.InputJsonObject,
          userId: req.session?.user.id,
        },
      });
    }
    const token = await client.Link.create(
      userVital?.user_id,
      undefined,
      WEBAPP_URL + "/api/integrations/vital/callback"
    );
    return res.status(200).json({
      token: token.link_token,
      url: `https://link.tryvital.io/?env=${vitalEnv.mode}&region=${vitalEnv.region}`,
    });
  } catch (e) {
    return res.status(400).json({ error: JSON.stringify(e) });
  }
}
