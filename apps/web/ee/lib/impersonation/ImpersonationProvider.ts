import CredentialsProvider from "next-auth/providers/credentials";
import { getSession } from "next-auth/react";

import prisma from "@lib/prisma";

import { ErrorPage } from "@components/error/error-page";

const ImpersonationProvider = CredentialsProvider({
  id: "impersonation-auth",
  name: "Impersonation",
  type: "credentials",
  credentials: {
    username: { label: "Username", type: "text " },
  },
  async authorize(creds, req) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore need to figure out how to correctly type this
    const session = await getSession({ req });
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
        disableImpersonation: true,
        teams: {
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

    if (impersonatedUser.disableImpersonation) {
      throw new Error("This user has disabled Impersonation.");
    }

    if (session?.user.username === creds?.username) {
      throw new Error("You cannot impersonate yourself.");
    }

    // Set impersonation Type to admin by default. This will only change if the user who is impersonating hits the clause below
    if (session?.user.role !== "ADMIN") {
      // Get user who is impersonating (Source User)
      const sessionUserFromDb = await prisma.user.findUnique({
        where: {
          id: session?.user.id,
        },
        select: {
          id: true,
          teams: {
            where: {
              OR: [
                {
                  role: "ADMIN",
                },
                {
                  role: "OWNER",
                },
              ],
            },
          },
        },
      });
      // They are not a admin or owner - throw error.
      if (!sessionUserFromDb) {
        throw new Error(
          "You do not have permission to do this. You are not an Admin/Owner of a team or the member has disabled impersonation"
        );
      }

      // Check if they are a team admin of a team the impersonatedUser is in.
      const sessionUsersTeams = sessionUserFromDb.teams.map((team) => team.teamId);
      // This currently disables impersonation on all teams the user is in. I cannot find a way to check which team this impersonation request came from.
      // If a user is in two teams with the same admin but has impersonation disabled in one of them - It will disable in both
      const impersonatedUserTeams = impersonatedUser.teams.map(
        (team: { disableImpersonation: boolean; teamId: number }) => {
          if (team.disableImpersonation) throw new Error("This user has impersonation disabled");
          return team.teamId;
        }
      );

      // Check if the sessions teams (only select if they are admin/owner)
      // is any of the teams the target user is in.
      const interceptionOfTeams = impersonatedUserTeams.filter((value) => sessionUsersTeams.includes(value));
      if (!(interceptionOfTeams.length > 0)) {
        throw new Error("You do not have permission to do this.");
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
