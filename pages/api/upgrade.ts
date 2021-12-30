import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import { WEBSITE_URL } from "@lib/config/constants";
import { HttpError as HttpCode } from "@lib/core/http/error";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.id) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  if (req.method !== "POST") {
    throw new HttpCode({ statusCode: 405, message: "Method Not Allowed" });
  }

  const user = await prisma.user.findUnique({
    rejectOnNotFound: true,
    where: {
      id: session.user.id,
    },
    select: {
      email: true,
      metadata: true,
    },
  });

  const response = await fetch(`${WEBSITE_URL}/api/upgrade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      stripeCustomerId: (user.metadata as Prisma.JsonObject)?.stripeCustomerId,
      email: user.email,
      fromApp: true,
    }),
  });
  const data = await response.json();

  res.status(response.status).json(data);
}
