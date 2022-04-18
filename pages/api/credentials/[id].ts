import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { CredentialResponse } from "@lib/types";
import { getCalcomUserId } from "@lib/utils/getCalcomUserId";
import { schemaCredentialBodyParams, schemaCredentialPublic } from "@lib/validations/credential";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /v1/credentials/{id}:
 *   get:
 *     summary: Get a credential by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the credential to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - credentials
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: Credential was not found
 *   patch:
 *     summary: Edit an existing credential
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: credential
 *        description: The credential to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/Credential'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the credential to edit
 *     security:
 *       - ApiKeyAuth: []
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
 *   delete:
 *     summary: Remove an existing credential
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the credential to delete
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - credentials
 *     responses:
 *       201:
 *         description: OK, credential removed successfuly
 *         model: Credential
 *       400:
 *        description: Bad request. Credential id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function credentialById(req: NextApiRequest, res: NextApiResponse<CredentialResponse>) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaCredentialBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);
  const userId = getCalcomUserId(res);
  const data = await prisma.credential.findMany({ where: { userId } });
  const credentialIds = data.map((credential) => credential.id);
  // res.status(200).json({ data });
  if (credentialIds.includes(safeQuery.data.id)) {
    switch (method) {
      case "GET":
        await prisma.credential
          .findUnique({ where: { id: safeQuery.data.id } })
          .then((data) => schemaCredentialPublic.parse(data))
          .then((credential) => res.status(200).json({ credential }))
          .catch((error: Error) =>
            res.status(404).json({ message: `Credential with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      case "PATCH":
        if (!safeBody.success) throw new Error("Invalid request body");
        await prisma.credential
          .update({
            where: { id: safeQuery.data.id },
            data: safeBody.data,
          })
          .then((data) => schemaCredentialPublic.parse(data))
          .then((credential) => res.status(200).json({ credential }))
          .catch((error: Error) =>
            res.status(404).json({ message: `Credential with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      case "DELETE":
        await prisma.credential
          .delete({ where: { id: safeQuery.data.id } })
          .then(() =>
            res.status(200).json({ message: `Credential with id: ${safeQuery.data.id} deleted successfully` })
          )
          .catch((error: Error) =>
            res.status(404).json({ message: `Credential with id: ${safeQuery.data.id} not found`, error })
          );
        break;

      default:
        res.status(405).json({ message: "Method not allowed" });
        break;
    }
  } else res.status(401).json({ message: "Unauthorized" });
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(credentialById));
