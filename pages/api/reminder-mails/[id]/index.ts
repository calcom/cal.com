import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { withMiddleware } from "@lib/helpers/withMiddleware";
import type { ReminderMailResponse } from "@lib/types";
import { schemaReminderMailPublic } from "@lib/validations/reminder-mail";
import {
  schemaQueryIdParseInt,
  withValidQueryIdTransformParseInt,
} from "@lib/validations/shared/queryIdTransformParseInt";

/**
 * @swagger
 * /api/reminder-mails/{id}:
 *   get:
 *     summary: Get a reminder mail by ID
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          type: integer
 *        required: true
 *        description: Numeric ID of the reminderMail to get
 *     tags:
 *     - reminder-mails
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       404:
 *         description: ReminderMail was not found
 */
export async function reminderMailById(req: NextApiRequest, res: NextApiResponse<ReminderMailResponse>) {
  const safe = await schemaQueryIdParseInt.safeParse(req.query);
  if (!safe.success) throw new Error("Invalid request query");

  const reminderMail = await prisma.reminderMail.findUnique({ where: { id: safe.data.id } });
  const data = schemaReminderMailPublic.parse(reminderMail);

  if (reminderMail) res.status(200).json({ data });
  else
    (error: Error) =>
      res.status(404).json({
        message: "ReminderMail was not found",
        error,
      });
}

export default withMiddleware("HTTP_GET")(withValidQueryIdTransformParseInt(reminderMailById));
