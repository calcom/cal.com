import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { CredentialResponse } from "@lib/types";
import {
  schemaCredentialBodyParams,
  schemaCredentialPublic,
  withValidCredential,
} from "@lib/validations/credential";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/credentials/{id}/edit:
 *   patch:
 *     summary: Edit an existing credential
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the credential to edit
 *     tags:
 *     - credentials
 *     responses:
 *       201:
 *         description: OK, credential edited successfuly
 *         model: Credential
 *       400:
 *        description: Bad request. Credential body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editCredential(req: NextApiRequest, res: NextApiResponse<CredentialResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaCredentialBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const credential = await prisma.credential.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaCredentialPublic.parse(credential);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidCredential(editCredential))
);
