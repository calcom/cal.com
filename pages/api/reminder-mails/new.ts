import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ReminderMailResponse } from "@lib/types";
import {
  schemaReminderMailBodyParams,
  schemaReminderMailPublic,
  withValidReminderMail,
} from "@lib/validations/reminder-mail";

/**
 * @swagger
 * /api/reminder-mails/new:
 *   post:
 *     summary: Creates a new reminderMail
 *   requestBody:
 *     description: Optional description in *Markdown*
 *     required: true
 *     content:
 *       application/json:
 *           schema:
 *           $ref: '#/components/schemas/ReminderMail'
 *     tags:
 *     - reminderMails
 *     responses:
 *       201:
 *         description: OK, reminderMail created
 *         model: ReminderMail
 *       400:
 *        description: Bad request. ReminderMail body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createReminderMail(req: NextApiRequest, res: NextApiResponse<ReminderMailResponse>) {
  const safe = schemaReminderMailBodyParams.safeParse(req.body);
  if (!safe.success) throw new Error("Invalid request body", safe.error);

  const reminderMail = await prisma.reminderMail.create({ data: safe.data });
  const data = schemaReminderMailPublic.parse(reminderMail);

  if (data) res.status(201).json({ data, message: "ReminderMail created successfully" });
  else
    (error: Error) =>
      res.status(400).json({
        message: "Could not create new reminderMail",
        error,
      });
}

export default withMiddleware("HTTP_POST")(withValidReminderMail(createReminderMail));
