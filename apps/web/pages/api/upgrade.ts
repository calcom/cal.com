import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSession } from "@lib/auth";
import { WEBSITE_URL } from "@lib/config/constants";
import { HttpError as HttpCode } from "@lib/core/http/error";
import prisma from "@lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession({ req });
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  if (!["GET", "POST"].includes(req.method!)) {
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

  try {
    const response = await fetch(`${WEBSITE_URL}/api/upgrade`, {
      method: "POST",
      credentials: "include",
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

    if (!data.url) throw new HttpCode({ statusCode: 401, message: data.message });

    res.redirect(303, data.url);
  } catch (error) {
    console.error(`error`, error);
    res.redirect(303, req.headers.origin || "/");
  }
}
