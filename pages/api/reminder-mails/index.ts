import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import { ReminderMailsResponse } from "@lib/types";
import { schemaReminderMailPublic } from "@lib/validations/reminder-mail";

/**
 * @swagger
 * /api/reminder-mails:
 *   get:
 *     summary: Get all reminderMails
 *     tags:
 *     - reminderMails
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: No reminderMails were found
 */
async function allReminderMails(_: NextApiRequest, res: NextApiResponse<ReminderMailsResponse>) {
  const reminderMails = await prisma.reminderMail.findMany();
  const data = reminderMails.map((reminderMail) => schemaReminderMailPublic.parse(reminderMail));

  if (data) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "No ReminderMails were found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(allReminderMails);
