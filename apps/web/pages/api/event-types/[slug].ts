import type { NextApiRequest, NextApiResponse } from "next";
import z from "zod";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import getIP from "@calcom/lib/getIP";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

const querySchema = z.object({
  slug: z.string({ required_error: "event-type slug is required" }),
});

async function handler(req: NextApiRequest & { userId?: number }, res: NextApiResponse) {
  const userIp = getIP(req);

  await checkRateLimitAndThrowError({
    rateLimitingType: "core",
    identifier: userIp,
  });

  const session = await getServerSession({ req, res });
  if (!session) return res.status(409).json({ message: "Unauthorized" });

  const parsedQuery = querySchema.safeParse(req.query);
  if (!parsedQuery.success) throw new HttpError({ statusCode: 400, message: parsedQuery.error.message });

  const {
    data: { slug },
  } = parsedQuery;
  if (!slug) return res.status(400).json({ message: "event-type slug is needed" });

  const eventType = await prisma.eventType.findFirst({
    where: { slug, userId: session.user.id },
    select: {
      id: true,
      title: true,
      eventName: true,
      users: {
        select: {
          id: true,
          username: true,
          organization: true,
        },
      },
    },
  });

  if (!eventType) return res.status(400).json({ message: "event-type not found" });

  return res.status(200).json(eventType);
}
