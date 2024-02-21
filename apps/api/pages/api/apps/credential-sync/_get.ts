import type { NextApiRequest } from "next";
import z from "zod";

import { defaultResponder } from "@calcom/lib/server";

const getCredentialsBodySchema = z.object({
  userId: z.number().int(),
  appSlug: z.string().optional(),
});

/**
 * @swagger
 * /apps/app-credential:
 *   get:
 *     operationId: listAppCredentials
 *     summary: Find credentials associated with a user
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *     tags:
 *     - attendees
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No attendees were found
 */
async function handler(req: NextApiRequest) {
  const { prisma } = req;
  const reqBody = getCredentialsBodySchema.parse(req.body);

  const credentials = await prisma.credential.findMany({
    where: {
      userId: reqBody.userId,
      ...(reqBody.appSlug ? { appId: reqBody.appSlug } : {}),
    },
    select: {
      id: true,
      appId: true,
    },
  });

  return credentials;
}

export default defaultResponder(handler);
