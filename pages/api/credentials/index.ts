import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { CredentialsResponse } from "@lib/types";
import { schemaCredentialPublic } from "@lib/validations/credential";

/**
 * @swagger
 * /api/credentials:
 *   get:
 *     summary: Get all credentials
 *     tags:
 *     - credentials
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No credentials were found
 */
async function allCredentials(_: NextApiRequest, res: NextApiResponse<CredentialsResponse>) {
  const credentials = await prisma.credential.findMany();
  const data = credentials.map((credential) => schemaCredentialPublic.parse(credential));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No Credentials were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allCredentials);
