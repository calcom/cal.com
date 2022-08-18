import { createHmac } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import getRawBody from "raw-body";

import { default as webPrisma } from "@calcom/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * API for Helpscout to retrieve key information about a user from a ticket
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    if (!req.headers["x-helpscout-signature"]) {
      res.status(400).end();
    } else {
      if (process.env.CALENDSO_ENCRYPTION_KEY) {
        const rawBody = await getRawBody(req);
        const body = JSON.parse(rawBody.toString());
        const calculatedSig = createHmac("sha1", process.env.CALENDSO_ENCRYPTION_KEY)
          .update(rawBody)
          .digest("base64");
        if (req.headers["x-helpscout-signature"] === calculatedSig) {
          if (body && body.customer && body.customer.email) {
            const user = await webPrisma.user.findFirst({
              where: { email: body.customer.email },
              select: { username: true, id: true, plan: true },
            });
            if (user) {
              const lastBooking = await webPrisma.attendee.findFirst({
                where: {
                  email: body.customer.email,
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
              res.status(200).json({
                html: `
                <ul>
                  <li><b>Username:</b>&nbsp;${user?.username}</li>
                  <li><b>Last booking:</b>&nbsp;${
                    lastBooking && lastBooking.booking
                      ? new Date(lastBooking.booking.createdAt).toLocaleDateString("en-US")
                      : "No info"
                  }</li>
                  <li><b>Plan:</b>&nbsp;${user?.plan}</li>
                </ul>
              `,
              });
            } else {
              res.status(200).json({ html: "No user found" });
            }
          } else {
            res.status(200).json({ html: "No email provided" });
          }
        } else {
          res.status(400).end();
        }
      } else {
        res.status(500).end();
      }
    }
  } else {
    return res.status(200).end();
  }
}
