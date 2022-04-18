import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { ReminderMailResponse, ReminderMailsResponse } from "@lib/types";
import {
  schemaReminderMailBodyParams,
  schemaReminderMailPublic,
  withValidReminderMail,
} from "@lib/validations/reminder-mail";

/**
 * @swagger
 * /v1/reminder-mails:
 *   get:
 *     summary: Get all reminder mails
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
 *         description: No reminder mails were found
 *   post:
 *     summary: Creates a new reminder mail
 *     security:
 *       - ApiKeyAuth: []
 *     tags:
 *     - reminder-mails
 *     responses:
 *       201:
 *         description: OK, reminder mail created
 *         model: ReminderMail
 *       400:
 *        description: Bad request. ReminderMail body is invalid.
 *       401:
 *        description: Authorization information is missing or invalid.
 */
async function createOrlistAllReminderMails(
  req: NextApiRequest,
  res: NextApiResponse<ReminderMailsResponse | ReminderMailResponse>
) {
  const { method } = req;
  if (method === "GET") {
    const data = await prisma.reminderMail.findMany();
    const reminder_mails = data.map((reminderMail) => schemaReminderMailPublic.parse(reminderMail));
    if (reminder_mails) res.status(200).json({ reminder_mails });
    else
      (error: Error) =>
        res.status(404).json({
          message: "No ReminderMails were found",
          error,
        });
  } else if (method === "POST") {
    const safe = schemaReminderMailBodyParams.safeParse(req.body);
    if (!safe.success) throw new Error("Invalid request body");

    const data = await prisma.reminderMail.create({ data: safe.data });
    const reminder_mail = schemaReminderMailPublic.parse(data);

    if (reminder_mail) res.status(201).json({ reminder_mail, message: "reminder mail created successfully" });
    else
      (error: Error) =>
        res.status(400).json({
          message: "could not create new reminder mail",
          error,
        });
  } else res.status(405).json({ message: `Method ${method} not allowed` });
}

export default withMiddleware("HTTP_GET_OR_POST")(withValidReminderMail(createOrlistAllReminderMails));
