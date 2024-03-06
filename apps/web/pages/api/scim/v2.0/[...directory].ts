import type { DirectorySyncEvent, DirectorySyncRequest, User } from "@boxyhq/saml-jackson";
import type { NextApiRequest, NextApiResponse } from "next";

import createUserAndInviteToOrg from "@calcom/features/ee/dsync/lib/createUserAndInviteToOrg";
import inviteExistingUserToOrg from "@calcom/features/ee/dsync/lib/inviteExistingUserToOrg";
import removeUserFromOrg from "@calcom/features/ee/dsync/lib/removeUserFromOrg";
import jackson from "@calcom/features/ee/sso/lib/jackson";
import { getTranslation } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import type { UserWithMembership } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import { getTeamOrThrow } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

// This is the handler for the SCIM API requests
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { dsyncController } = await jackson();

  const { method, query, body } = req;

  const [directoryId, path, resourceId] = query.directory as string[];

  // Handle the SCIM API requests
  const request: DirectorySyncRequest = {
    method: method as string,
    directoryId,
    resourceId,
    apiSecret: extractAuthToken(req),
    resourceType: path === "Users" ? "users" : "groups",
    body: body ? JSON.parse(body) : undefined,
    query: {
      count: req.query.count ? parseInt(req.query.count as string) : undefined,
      startIndex: req.query.startIndex ? parseInt(req.query.startIndex as string) : undefined,
      filter: req.query.filter as string,
    },
  };

  const { status, data } = await dsyncController.requests.handle(request, handleEvents);

  res.status(status).json(data);
}

// Fetch the auth token from the request headers
export const extractAuthToken = (req: NextApiRequest): string | null => {
  const authHeader = req.headers.authorization || null;

  return authHeader ? authHeader.split(" ")[1] : null;
};

// Handle the SCIM events
const handleEvents = async (event: DirectorySyncEvent) => {
  console.log("Received event", event);
  const dSyncData = await prisma.dSyncData.findFirst({
    where: {
      directoryId: event.directory_id,
    },
    select: {
      id: true,
      orgId: true,
    },
  });

  if (!dSyncData) {
    throw new Error("Directory sync data not found");
  }

  const { orgId } = dSyncData;

  if (!orgId) {
    throw new Error(`Org ID not found for dsync ${dSyncData.id}`);
  }

  if (event.event === "user.created" || event.event === "user.updated") {
    const eventData = event.data as User;
    const userEmail = eventData.email;
    const translation = await getTranslation("en", "common");
    // Check if user exists in DB
    const user = await prisma.user.findFirst({
      where: {
        email: userEmail,
      },
      select: {
        id: true,
        email: true,
        username: true,
        organizationId: true,
        completedOnboarding: true,
        identityProvider: true,
        profiles: true,
        password: {
          select: {
            hash: true,
          },
        },
      },
    });

    // User is already a part of that org
    if (user?.organizationId && eventData.active) {
      return;
    }

    const org = await getTeamOrThrow(orgId);

    if (!org) {
      throw new Error("Org not found");
    }

    if (user) {
      // If data.active is true then provision the user into the org
      eventData.active
        ? await inviteExistingUserToOrg({
            user: user as UserWithMembership,
            org,
            translation,
          })
        : // If data.active is false then remove the user from the org
          await removeUserFromOrg({
            userId: user.id,
            orgId,
          });

      // If user is not in DB, create user and add to the org
    } else {
      await createUserAndInviteToOrg({
        userEmail,
        org,
        translation,
      });
    }
  }
};
