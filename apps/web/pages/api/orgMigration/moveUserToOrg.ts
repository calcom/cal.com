import { getFormSchema } from "@pages/settings/admin/orgMigrations/moveUserToOrg";
import type { NextApiRequest, NextApiResponse } from "next/types";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { moveUserToOrg } from "../../../lib/orgMigration";

const log = logger.getSubLogger({ prefix: ["moveUserToOrg"] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const rawBody = req.body;
  const translate = await getTranslation("en", "common");
  const migrateBodySchema = getFormSchema(translate);
  log.debug(
    "Starting migration:",
    safeStringify({
      body: rawBody,
    })
  );
  const parsedBody = migrateBodySchema.safeParse(rawBody);

  const session = await getServerSession({ req });

  if (!session) {
    res.status(403).json({ message: "No session found" });
    return;
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;

  if (parsedBody.success) {
    const { userId, userName, shouldMoveTeams, targetOrgId, targetOrgUsername, targetOrgRole } =
      parsedBody.data;
    const isAllowed = isAdmin;
    if (isAllowed) {
      try {
        await moveUserToOrg({
          targetOrg: {
            id: targetOrgId,
            username: targetOrgUsername,
            membership: {
              role: targetOrgRole,
            },
          },
          user: {
            id: userId,
            userName,
          },
          shouldMoveTeams,
        });
      } catch (error) {
        if (error instanceof HttpError) {
          if (error.statusCode > 300) {
            log.error("Migration failed:", safeStringify(error));
          }
          return res.status(error.statusCode).json({ message: error.message });
        }
        log.error("Migration failed:", safeStringify(error));
        const errorMessage = error instanceof Error ? error.message : "Something went wrong";

        return res.status(400).json({ message: errorMessage });
      }
    } else {
      return res.status(403).json({ message: "Not Authorized" });
    }
    return res.status(200).json({ message: "Migrated" });
  }
  log.error("Migration failed:", safeStringify(parsedBody.error));
  return res.status(400).json({ message: JSON.stringify(parsedBody.error) });
}
