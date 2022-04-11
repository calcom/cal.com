import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { CredentialResponse, CredentialsResponse } from "@lib/types";
import { schemaCredentialBodyParams, schemaCredentialPublic } from "@lib/validations/credential";

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
 *   post:
 *     summary: Creates a new credential
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
async function createOrlistAllCredentials(
  req: NextApiRequest,
  res: NextApiResponse<CredentialsResponse | CredentialResponse>
) {
  const { method } = req;
  if (method === "GET") {
    const data = await prisma.credential.findMany();
    const credentials = data.map((credential) => schemaCredentialPublic.parse(credential));
    if (credentials) res.status(200).json({ credentials });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No Credentials were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaCredentialBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.credential.create({ data: safe.data });
    const credential = schemaCredentialPublic.parse(data);

    if (credential) res.status(201).json({ credential, message: "Credential created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "Could not create new credential",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(createOrlistAllCredentials);
