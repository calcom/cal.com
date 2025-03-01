import type { NextApiRequest, NextApiResponse } from "next";

import { dub } from "@calcom/features/auth/lib/dub";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession({ req });

  if (!session?.user?.username) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { shortLink } = await dub.links.get({
      externalId: `ext_${session.user.id.toString()}`,
    });
    return res.status(200).json({ shortLink });
  } catch (error) {
    console.log("Referral link not found, creating...");
  }

  const { id: referralLinkId, shortLink } = await dub.links.create({
    domain: "refer.cal.com",
    key: session.user.username,
    url: "https://cal.com",
    externalId: session.user.id.toString(), // @see https://d.to/externalId
    trackConversion: true, // enable conversion tracking @see https://d.to/conversions
  });

  /*
    Even though we are relying in externalId for retrieving the referral link,
    we still save the referralLinkId in the database for future reference.
    E.g. we can use this to tell how many users created a referral link.
  */
  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      referralLinkId,
    },
  });

  return res.status(200).json({ shortLink });
}
