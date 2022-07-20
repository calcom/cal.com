import CredentialsProvider from "next-auth/providers/credentials";
import { getSession } from "next-auth/react";

import prisma from "@lib/prisma";

const ImpersonationProvider = CredentialsProvider({
  id: "impersonation-auth",
  name: "Impersonation",
  type: "credentials",
  credentials: {
    username: { type: "text " },
    teamId: { type: "text" },
  },
  async authorize(creds, req) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore need to figure out how to correctly type this
    const session = await getSession({ req });

    if (session?.user.username === creds?.username) {
      throw new Error("You cannot impersonate yourself.");
    }

    if (!creds?.username) throw new Error("Username must be present");

    // Check session
    const sessionUserFromDb = await prisma.user.findUnique({
      where: {
        id: session?.user.id,
      },
      include: {
        teams: {
          where: {
            AND: [
              {
                role: {
                  not: "MEMBER",
                },
              },
              {
                team: {
                  id: parseInt(creds.teamId),
                },
              },
            ],
          },
        },
      },
    });

    if (sessionUserFromDb?.role !== "ADMIN" && sessionUserFromDb?.teams.length === 0) {
      throw new Error("You are not an admin of any teams");
    }

    // Get user who is being impersonated
    const impersonatedUser = await prisma.user.findUnique({
      where: {
        username: creds?.username,
      },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        email: true,
        teams: {
          where: {
            disableImpersonation: false, // Ensure they have impersonation enabled
            accepted: true, // Ensure they are apart of the team and not just invited.
            team: {
              id: parseInt(creds.teamId), // Bring back only the right team
            },
          },
          select: {
            teamId: true,
            disableImpersonation: true,
          },
        },
      },
    });

    // Check if impersonating is allowed for this user
    if (!impersonatedUser) {
      throw new Error("This user does not exist");
    }

    // Ensure there is teams that match this team id. We have to check this as teamId won't exist in admin Impersonation
    if (sessionUserFromDb?.role !== "ADMIN" && impersonatedUser?.teams.length === 0) {
      throw new Error("You do not have permission to do this.");
    }

    // This should only ever be One team - since we are selecting based of ID.
    if (sessionUserFromDb?.role !== "ADMIN") {
      if (process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "true") {
        // We only care about the team impersonation check if you are not an admin
        impersonatedUser.teams.forEach((el) => {
          if (el.disableImpersonation) {
            throw new Error("This user has impersonation disabled");
          }
        });
      } else {
        throw new Error("Team Impersonation is not enabled. Please enable it within .env");
      }
    }

    // Log impersonations for audit purposes
    await prisma.impersonations.create({
      data: {
        impersonatedBy: {
          connect: {
            id: session?.user.id,
          },
        },
        impersonatedUser: {
          connect: {
            id: impersonatedUser.id,
          },
        },
      },
    });

    const obj = {
      id: impersonatedUser.id,
      username: impersonatedUser.username,
      email: impersonatedUser.email,
      name: impersonatedUser.name,
      role: impersonatedUser.role,
      impersonatedByUID: session?.user.id,
    };
    return obj;
  },
});

export default ImpersonationProvider;
