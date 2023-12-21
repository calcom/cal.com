import { getFormSchema } from "@pages/settings/admin/orgMigrations/moveTeamToOrg";
import { getSession } from "next-auth/react";
import type { NextApiRequest, NextApiResponse } from "next/types";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { moveTeamToOrg } from "../../../lib/orgMigration";

const log = logger.getSubLogger({ prefix: ["moveTeamToOrg"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawBody = req.body;

  log.debug(
    "Moving team to org:",
    safeStringify({
      body: rawBody,
    })
  );

  const translate = await getTranslation("en", "common");
  const moveTeamToOrgSchema = getFormSchema(translate);

  const parsedBody = moveTeamToOrgSchema.safeParse(rawBody);

  // Don't know why but if I let it go to getSession, it doesn't return the session.  🤯
  req.body = null;

  const session = await getSession({ req });

  if (!session) {
    return res.status(403).json({ message: "No session found" });
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;

  if (!parsedBody.success) {
    log.error("moveTeamToOrg failed:", safeStringify(parsedBody.error));
    return res.status(400).json({ message: JSON.stringify(parsedBody.error) });
  }

  const { teamId, targetOrgId, moveMembers } = parsedBody.data;
  const isAllowed = isAdmin;
  if (!isAllowed) {
    return res.status(403).json({ message: "Not Authorized" });
  }

  try {
    await moveTeamToOrg({
      targetOrgId,
      teamId,
      moveMembers,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.statusCode > 300) {
        log.error("moveTeamToOrg failed:", safeStringify(error.message));
      }
      return res.status(error.statusCode).json({ message: error.message });
    }
    log.error("moveTeamToOrg failed:", safeStringify(error));
    return res.status(500).json({ message: (error as any)?.message });
  }

  return res.status(200).json({
    message: `Added team ${teamId} to Org: ${targetOrgId} ${
      moveMembers ? " along with the members" : " without the members"
    }`,
  });
}
