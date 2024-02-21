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
 *     requestBody:
 *       description: Create a new booking related to one of your event-types
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *              userId:
 *               type: integer
 *               description: If of the user on your instance of Cal.com
 *             appSlug:
 *              type: string
 *              description: (optional) Slug of the specific app. Can be found in the app metadata under packages/app-store
 *     tags:
 *     - credentials
 *     responses:
 *       200:
 *         description: OK
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
