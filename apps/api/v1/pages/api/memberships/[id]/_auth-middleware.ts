import type { NextApiRequest } from "next";

import { checkPermissionWithFallback } from "@calcom/features/pbac/lib/checkPermissionWithFallback";
import { HttpError } from "@calcom/lib/http-error";
import { MembershipRole } from "@calcom/prisma/enums";

import { membershipIdSchema } from "~/lib/validations/membership";

async function authMiddleware(req: NextApiRequest) {
  const { userId, isSystemWideAdmin } = req;
  const { teamId } = membershipIdSchema.parse(req.query);
  // Admins can just skip this check
  if (isSystemWideAdmin) return;

  const hasPermission = await checkPermissionWithFallback({
    userId,
    teamId,
    permission: "team.changeMemberRole",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!hasPermission) throw new HttpError({ statusCode: 403, message: "Forbidden" });
}

export default authMiddleware;
