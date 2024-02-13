import type { DirectorySyncEvent, DirectorySyncRequest, User } from "@boxyhq/saml-jackson";
import type { NextApiRequest, NextApiResponse } from "next";

import jackson from "@calcom/features/ee/sso/lib/jackson";
import { getTranslation } from "@calcom/lib/server/i18n";
import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import slugify from "@calcom/lib/slugify";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { sendSignupToOrganizationEmail } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

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
  console.log("🚀 ~ handler ~ request:", request);

  const { status, data } = await dsyncController.requests.handle(request, handleEvents);
  console.log("🚀 ~ handler ~ data:", data);
  console.log("🚀 ~ handler ~ status:", status);

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
  // TODO only add the users to an org
  // throw new HttpError({ statusCode: 405, message: "Method Not Allowed" });
  const dSyncData = await prisma.dSyncData.findFirst({
    where: {
      directoryId: event.directory_id,
    },
    select: {
      orgId: true,
      org: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!dSyncData) {
    throw new Error("Directory sync data not found");
  }

  const { orgId } = dSyncData;

  console.log(typeof event.event);

  if (event.event === "user.created" || event.event === "user.updated") {
    const eventData = event.data as User;
    const userEmail = eventData.email;
    const translation = await getTranslation("en", "common");
    // If orgId then it is for a org else for the entire app
    if (dSyncData.org && orgId) {
      // Check if user exists in DB
      const user = await prisma.user.findFirst({
        where: {
          email: userEmail,
        },
        select: {
          id: true,
          organizationId: true,
        },
      });

      // User is already a part of that org
      if (user?.organizationId) {
        return;
      }

      // If user already in DB, automatically add them to the org

      if (user) {
        // Add user to team/org
        await prisma.membership.create({
          data: {
            teamId: orgId,
            userId: user.id,
            role: "MEMBER",
            // Since coming from directory assume it'll be verified
            accepted: true,
          },
        });
        // If user is not in DB, create user and add to the org
      } else {
        const [emailUser, emailDomain] = userEmail.split("@");
        const username = slugify(`${emailUser}-${emailDomain.split(".")[0]}`);
        await prisma.user.create({
          data: {
            username,
            email: userEmail,
            // name: event.data?.givenName,
            // Assume verified since coming from directory
            verified: true,
            invitedTo: orgId,
            organizationId: orgId,
            teams: {
              create: {
                teamId: orgId,
                role: MembershipRole.MEMBER,
                accepted: true,
              },
            },
            profiles: {
              createMany: {
                data: [
                  {
                    uid: ProfileRepository.generateProfileUid(),
                    username,
                    organizationId: orgId,
                  },
                ],
              },
            },
          },
        });

        sendSignupToOrganizationEmail({
          usernameOrEmail: userEmail,
          team: dSyncData.org,
          translation,
          inviterName: dSyncData.org?.name,
          input: {
            teamId: orgId,
            role: MembershipRole.MEMBER,
            usernameOrEmail: userEmail,
            language: "en",
            isOrg: true,
          },
        });
      }
    }

    // Go through users
    // If not create user and invite
  }
};
