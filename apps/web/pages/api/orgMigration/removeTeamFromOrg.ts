import { getFormSchema } from "@pages/settings/admin/orgMigrations/removeTeamFromOrg";
import type { NextApiRequest, NextApiResponse } from "next/types";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { removeTeamFromOrg } from "../../../lib/orgMigration";

const log = logger.getSubLogger({ prefix: ["removeTeamFromOrg"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawBody = req.body;
  const translate = await getTranslation("en", "common");
  const removeTeamFromOrgSchema = getFormSchema(translate);
  log.debug(
    "Removing team from org:",
    safeStringify({
      body: rawBody,
    })
  );
  const parsedBody = removeTeamFromOrgSchema.safeParse(rawBody);

  const session = await getServerSession({ req });

  if (!session) {
    return res.status(403).json({ message: "No session found" });
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;

  if (!parsedBody.success) {
    log.error("RemoveTeamFromOrg failed:", safeStringify(parsedBody.error));
    return res.status(400).json({ message: JSON.stringify(parsedBody.error) });
  }
  const { teamId, targetOrgId } = parsedBody.data;
  const isAllowed = isAdmin;
  if (!isAllowed) {
    return res.status(403).json({ message: "Not Authorized" });
  }

  try {
    await removeTeamFromOrg({
      targetOrgId,
      teamId,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.statusCode > 300) {
        log.error("RemoveTeamFromOrg failed:", safeStringify(error));
      }
      return res.status(error.statusCode).json({ message: error.message });
    }
    log.error("RemoveTeamFromOrg failed:", safeStringify(error));
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return res.status(500).json({ message: errorMessage });
  }

  return res.status(200).json({ message: `Removed team ${teamId} from ${targetOrgId}` });
}
