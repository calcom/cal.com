import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";

import { membershipIdSchema } from "~/lib/validations/membership";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isAdmin, prisma } = req;
  const { teamId } = membershipIdSchema.parse(req.query);
  // Admins can just skip this check
  if (isAdmin) return;
  // Only team members can modify a membership
  const membership = await prisma.membership.findFirst({ where: { userId, teamId } });
  if (!membership) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
