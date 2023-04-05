import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

const WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/13198585/321aih2/";

const userSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  email: z.string().email(),
});

const usersSchema = z.array(userSchema).min(0);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // const apiKey = req.headers.authorization || req.query.apiKey;
  //   if (process.env.CRON_API_KEY !== apiKey) {
  //     res.status(401).json({ message: "Not authenticated" });
  //     return;
  //   }

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const users: z.infer<typeof usersSchema> = await prisma.user.findMany({
    where: {
      createdDate: {
        lt: twoWeeksAgo,
      },
      bookings: {
        none: {},
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  try {
    users.map(async (user) => {
      await fetch(WEBHOOK_URL, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(user),
      });
    });
  } catch (err) {
    console.log(`Error Sending data to webhook ${WEBHOOK_URL}`, err);
  }

  res.status(200).json({ users });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
