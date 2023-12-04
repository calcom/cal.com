import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { selectedCalendarIdSchema } from "~/lib/validations/selected-calendar";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin } = req;
  const { userId: queryUserId } = selectedCalendarIdSchema.parse(req.query);
  // Admins can just skip this check
  if (isAdmin) return;
  // Check if the current user requesting is the same as the one being requested
  if (userId !== queryUserId) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
