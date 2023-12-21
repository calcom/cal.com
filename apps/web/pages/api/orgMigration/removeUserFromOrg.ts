import { getFormSchema } from "@pages/settings/admin/orgMigrations/removeUserFromOrg";
import { getSession } from "next-auth/react";
import type { NextApiRequest, NextApiResponse } from "next/types";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { removeUserFromOrg } from "../../../lib/orgMigration";

const log = logger.getSubLogger({ prefix: ["removeUserFromOrg"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body;

  log.debug(
    "Starting reverse migration:",
    safeStringify({
      body,
    })
  );

  const translate = await getTranslation("en", "common");
  const migrateRevertBodySchema = getFormSchema(translate);
  const parsedBody = migrateRevertBodySchema.safeParse(body);

  // Don't know why but if I let it go to getSession, it doesn't return the session.  🤯
  req.body = null;

  const session = await getSession({ req });

  if (!session) {
    return res.status(403).json({ message: "No session found" });
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;
  if (!isAdmin) {
    return res.status(403).json({ message: "Only admin can take this action" });
  }

  if (parsedBody.success) {
    const { userId, targetOrgId } = parsedBody.data;
    try {
      await removeUserFromOrg({ targetOrgId, userId });
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.statusCode > 300) {
          log.error("Reverse migration failed:", safeStringify(error));
        }
        return res.status(error.statusCode).json({ message: error.message });
      }
      log.error("Reverse migration failed:", safeStringify(error));
      return res.status(500).json({ message: (error as any)?.message });
    }
    return res.status(200).json({ message: "Reverted" });
  }
  log.error("Reverse Migration failed:", safeStringify(parsedBody.error));
  return res.status(400).json({ message: JSON.stringify(parsedBody.error) });
}
