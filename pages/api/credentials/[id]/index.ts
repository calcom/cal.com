import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { CredentialResponse } from "@lib/types";
import { schemaCredentialPublic } from "@lib/validations/credential";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/credentials/{id}:
 *   get:
 *     summary: Get a credential by ID
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the credential to get
 *     tags:
 *     - credentials
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Credential was not found
 */
export async function credentialById(req: NextApiRequest, res: NextApiResponse<CredentialResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const credential = await prisma.credential.findUnique({ where: { id: safe.data.id } });
  const data = schemaCredentialPublic.parse(credential);

  if (credential) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "Credential was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(credentialById));
