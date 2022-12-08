import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";
import z from "zod";

import { default as webPrisma } from "@calcom/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

const helpscoutRequestBodySchema = z.object({
  customer: z.object({
    email: z.string().email(),
  }),
});

/**
 * API for Helpscout to retrieve key information about a user from a ticket
 * Note: HelpScout expects a JSON with a `html` prop to show its content as HTML
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const hsSignature = req.headers["x-helpscout-signature"];
  if (!hsSignature) return res.status(400).end();

  if (!process.env.CALENDSO_ENCRYPTION_KEY) return res.status(500).end();

  const rawBody = await getRawBody(req);
  const parsedBody = helpscoutRequestBodySchema.safeParse(JSON.parse(rawBody.toString()));

  if (!parsedBody.success) return res.status(400).end();

  const calculatedSig = createHmac("sha1", process.env.CALENDSO_ENCRYPTION_KEY)
    .update(rawBody)
    .digest("base64");

  if (req.headers["x-helpscout-signature"] !== calculatedSig) return res.status(400).end();

  const user = await webPrisma.user.findFirst({
    where: {
      email: parsedBody.data.customer.email,
    },
    select: {
      username: true,
      id: true,
      createdDate: true,
    },
  });

  if (!user) return res.status(200).json({ html: "User not found" });

  const lastBooking = await webPrisma.attendee.findFirst({
    where: {
      email: parsedBody.data.customer.email,
    },
    select: {
      booking: {
        select: {
          createdAt: true,
        },
      },
    },
    orderBy: {
      booking: {
        createdAt: "desc",
      },
    },
  });

  return res.status(200).json({
    html: `
      <ul>
        <li><b>Username:</b>&nbsp;${user.username}</li>
        <li><b>Last booking:</b>&nbsp;${
          lastBooking && lastBooking.booking
            ? new Date(lastBooking.booking.createdAt).toLocaleDateString("en-US")
            : "No info"
        }</li>
        <li><b>Account created:</b>&nbsp;${new Date(user.createdDate).toLocaleDateString("en-US")}</li>
      </ul>
    `,
  });
}
