import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ReminderMailResponse } from "@lib/types";
import { schemaReminderMailBodyParams, schemaReminderMailPublic } from "@lib/validations/reminder-mail";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /v1/reminder-mails/{id}:
 *   get:
 *     summary: Get a reminderMail by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the reminderMail to get
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - reminder-mails
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: ReminderMail was not found
 *   patch:
 *     summary: Edit an existing reminderMail
 *     consumes:
 *       - application/json
 *     parameters:
 *      - in: body
 *        name: reminderMail
 *        description: The reminderMail to edit
 *        schema:
 *         type: object
 *         $ref: '#/components/schemas/ReminderMail'
 *        required: true
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the reminderMail to edit
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - reminder-mails
 *     responses:
 *       201:
 *         description: OK, reminderMail edited successfuly
 *         model: ReminderMail
 *       400:
 *        description: Bad request. ReminderMail body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 *   delete:
 *     summary: Remove an existing reminderMail
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the reminderMail to delete
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - reminder-mails
 *     responses:
 *       201:
 *         description: OK, reminderMail removed successfuly
 *         model: ReminderMail
 *       400:
 *        description: Bad request. ReminderMail id is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function reminderMailById(req: NextApiRequest, res: NextApiResponse<ReminderMailResponse>) {
  const { method, query, body } = req;
  const safeQuery = schemaQueryIdParseInt.safeParse(query);
  const safeBody = schemaReminderMailBodyParams.safeParse(body);
  if (!safeQuery.success) throw new Error("Invalid request query", safeQuery.error);

  switch (method) {
    case "GET":
      await prisma.reminderMail
        .findUnique({ where: { id: safeQuery.data.id } })
        .then((data) => schemaReminderMailPublic.parse(data))
        .then((reminder_mail) => res.status(200).json({ reminder_mail }))
        .catch((error: Error) =>
          res.status(404).json({ message: `ReminderMail with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "PATCH":
      if (!safeBody.success) throw new Error("Invalid request body");
      await prisma.reminderMail
        .update({
          where: { id: safeQuery.data.id },
          data: safeBody.data,
        })
        .then((reminderMail) => schemaReminderMailPublic.parse(reminderMail))
        .then((reminder_mail) => res.status(200).json({ reminder_mail }))
        .catch((error: Error) =>
          res.status(404).json({ message: `ReminderMail with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    case "DELETE":
      await prisma.reminderMail
        .delete({ where: { id: safeQuery.data.id } })
        .then(() =>
          res.status(200).json({ message: `ReminderMail with id: ${safeQuery.data.id} deleted successfully` })
        )
        .catch((error: Error) =>
          res.status(404).json({ message: `ReminderMail with id: ${safeQuery.data.id} not found`, error })
        );
      break;

    default:
      res.status(405).json({ message: "Method not allowed" });
      break;
  }
}

export default withMiddleware("HTTP_GET_DELETE_PATCH")(withValidQueryIdTransformParseInt(reminderMailById));
