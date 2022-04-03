import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { CredentialResponse } from "@lib/types";
import {
  schemaCredentialBodyParams,
  schemaCredentialPublic,
  withValidCredential,
} from "@lib/validations/credential";

/**
 * @swagger
 * /api/credentials/new:
 *   post:
 *     summary: Creates a new credential
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *           $ref: '#/components/schemas/Credential'
 *     tags:
 *     - credentials
 *     responses:
 *       201:
 *         description: OK, credential created
 *         model: Credential
 *       400:
 *        description: Bad request. Credential body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createCredential(req: NextApiRequest, res: NextApiResponse<CredentialResponse>) {
  const safe = schemaCredentialBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const credential = await prisma.credential.create({ data: safe.data });
  const data = schemaCredentialPublic.parse(credential);

  if (data) res.status(201).json({ data, message: "Credential created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new credential",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidCredential(createCredential));
