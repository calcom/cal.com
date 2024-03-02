import { getFormSchema } from "@pages/settings/admin/orgMigrations/removeUserFromOrg";
import type { NextApiRequest, NextApiResponse } from "next/types";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
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
  const session = await getServerSession({ req });

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
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";

      return res.status(500).json({ message: errorMessage });
    }
    return res.status(200).json({ message: "Reverted" });
  }
  log.error("Reverse Migration failed:", safeStringify(parsedBody.error));
  return res.status(400).json({ message: JSON.stringify(parsedBody.error) });
}
