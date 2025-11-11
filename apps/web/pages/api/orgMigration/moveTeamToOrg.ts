import { getFormSchema } from "@pages/settings/admin/orgMigrations/moveTeamToOrg";
import type { NextApiRequest, NextApiResponse } from "next/types";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getOrganizationRepository } from "@calcom/features/ee/organizations/di/OrganizationRepository.container";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import slugify from "@calcom/lib/slugify";
import { getTranslation } from "@calcom/lib/server";
import { CreationSource, UserPermissionRole } from "@calcom/prisma/enums";
import { createTeamsHandler } from "@calcom/trpc/server/routers/viewer/organizations/createTeams.handler";

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

  const session = await getServerSession({ req, res });

  if (!session) {
    return res.status(403).json({ message: "No session found" });
  }

  const isAdmin = session.user.role === UserPermissionRole.ADMIN;

  if (!parsedBody.success) {
    log.error("moveTeamToOrg failed:", safeStringify(parsedBody.error));
    return res.status(400).json({ message: JSON.stringify(parsedBody.error) });
  }

  const { teamId, targetOrgId, teamSlugInOrganization } = parsedBody.data;
  const isAllowed = isAdmin;
  if (!isAllowed) {
    return res.status(403).json({ message: "Not Authorized" });
  }

  try {
    const organizationRepository = getOrganizationRepository();
    const org = await organizationRepository.adminFindById({ id: targetOrgId });

    if (!org.members || org.members.length === 0) {
      throw new Error("Organization owner not found");
    }

    const orgOwner = org.members[0].user;

    log.info(
      "Admin moving team to organization",
      safeStringify({
        adminUserId: session.user.id,
        adminEmail: session.user.email,
        orgOwnerId: orgOwner.id,
        orgOwnerEmail: orgOwner.email,
        teamId,
        targetOrgId,
      })
    );

    await createTeamsHandler({
      ctx: {
        user: {
          id: orgOwner.id,
          organizationId: targetOrgId,
        },
      },
      input: {
        teamNames: [],
        orgId: targetOrgId,
        moveTeams: [
          {
            id: teamId,
            newSlug: teamSlugInOrganization ? slugify(teamSlugInOrganization) : null,
            shouldMove: true,
          },
        ],
        creationSource: CreationSource.WEBAPP,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.statusCode > 300) {
        log.error("moveTeamToOrg failed:", safeStringify(error.message));
      }
      return res.status(error.statusCode).json({ message: error.message });
    }
    log.error("moveTeamToOrg failed:", safeStringify(error));
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";

    return res.status(500).json({ message: errorMessage });
  }

  return res.status(200).json({
    message: `Added team ${teamId} to Org: ${targetOrgId}`,
  });
}
