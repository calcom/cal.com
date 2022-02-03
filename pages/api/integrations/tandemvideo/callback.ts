import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

const client_id = process.env.TANDEM_CLIENT_ID as string;
const client_secret = process.env.TANDEM_CLIENT_SECRET as string;
const TANDEM_BASE_URL = (process.env.TANDEM_BASE_URL as string) || "https://tandem.chat";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.query.code) {
    res.status(401).json({ message: "Missing code" });
    return;
  }

  const code = req.query.code as string;

  // Check that user is authenticated
  const session = await getSession({ req });

  if (!session?.user?.id) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }

  const result = await fetch(`${TANDEM_BASE_URL}/api/v1/oauth/v2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, client_id, client_secret }),
  });

  const responseBody = await result.json();

  if (result.ok) {
    responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
    delete responseBody.expires_in;

    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        credentials: {
          create: {
            type: "tandem_video",
            key: responseBody,
          },
        },
      },
    });
  }

  res.redirect("/integrations");
}
