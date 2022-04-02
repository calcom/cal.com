import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ReminderMailResponse } from "@lib/types";
import {
  schemaReminderMailBodyParams,
  schemaReminderMailPublic,
  withValidReminderMail,
} from "@lib/validations/reminder-mail";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/reminder-mails/{id}/edit:
 *   patch:
 *     summary: Edit an existing reminderMail
 *    parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the reminderMail to edit
 *     tags:
 *     - reminderMails
 *     responses:
 *       201:
 *         description: OK, reminderMail edited successfuly
 *         model: ReminderMail
 *       400:
 *        description: Bad request. ReminderMail body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
export async function editReminderMail(req: NextApiRequest, res: NextApiResponse<ReminderMailResponse>) {
  const safeQuery = await schemaQueryIdParseInt.safeParse(req.query);
  const safeBody = await schemaReminderMailBodyParams.safeParse(req.body);

  if (!safeQuery.success || !safeBody.success) throw new Error("Invalid request");
  const reminderMail = await prisma.reminderMail.update({
    where: { id: safeQuery.data.id },
    data: safeBody.data,
  });
  const data = schemaReminderMailPublic.parse(reminderMail);

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: `Event type with ID ${safeQuery.data.id} not found and wasn't updated`,
        error,
      });
}

export default withMiddleware("HTTP_PATCH")(
  withValidQueryIdTransformParseInt(withValidReminderMail(editReminderMail))
);
