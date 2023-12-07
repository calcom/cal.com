import type { User } from "@prisma/client";
import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { getSession } from "@calcom/features/auth/lib/getSession";
import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

const teamIdschema = z.object({
  teamId: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().positive()),
});

const auditAndReturnNextUser = async (
  impersonatedUser: Pick<User, "id" | "username" | "email" | "name" | "role" | "organizationId" | "locale">,
  impersonatedByUID: number,
  hasTeam?: boolean
) => {
  // Log impersonations for audit purposes
  await prisma.impersonations.create({
    data: {
      impersonatedBy: {
        connect: {
          id: impersonatedByUID,
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
    impersonatedByUID,
    belongsToActiveTeam: hasTeam,
    organizationId: impersonatedUser.organizationId,
    locale: impersonatedUser.locale,
  };

  return obj;
};

type Credentials = Record<"username" | "teamId", string> | undefined;

export function parseTeamId(creds: Partial<Credentials>) {
  return creds?.teamId ? teamIdschema.parse({ teamId: creds.teamId }).teamId : undefined;
}

export function checkSelfImpersonation(session: Session | null, creds: Partial<Credentials>) {
  if (session?.user.username === creds?.username || session?.user.email === creds?.username) {
    throw new Error("You cannot impersonate yourself.");
  }
}

export function checkUserIdentifier(creds: Partial<Credentials>) {
  if (!creds?.username) throw new Error("User identifier must be present");
}

export function checkPermission(session: Session | null) {
  if (
    (session?.user.role !== "ADMIN" && process.env.NEXT_PUBLIC_TEAM_IMPERSONATION === "false") ||
    !session?.user
  ) {
    throw new Error("You do not have permission to do this.");
  }
}

async function getImpersonatedUser({
  session,
  teamId,
  creds,
}: {
  session: Session | null;
  teamId: number | undefined;
  creds: Credentials | null;
}) {
  let TeamWhereClause: Prisma.MembershipWhereInput = {
    disableImpersonation: false, // Ensure they have impersonation enabled
    accepted: true, // Ensure they are apart of the team and not just invited.
    team: {
      id: teamId, // Bring back only the right team
    },
  };

  // If you are an admin we dont need to follow this flow -> We can just follow the usual flow
  // If orgId and teamId are the same we can follow the same flow
  if (session?.user.org?.id && session.user.org.id !== teamId && session?.user.role !== "ADMIN") {
    TeamWhereClause = {
      disableImpersonation: false,
      accepted: true,
      team: {
        id: session.user.org.id,
      },
    };
  }

  // Get user who is being impersonated
  const impersonatedUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: creds?.username }, { email: creds?.username }],
    },
    select: {
      id: true,
      username: true,
      role: true,
      name: true,
      email: true,
      organizationId: true,
      disableImpersonation: true,
      locale: true,
      teams: {
        where: TeamWhereClause,
        select: {
          teamId: true,
          disableImpersonation: true,
          role: true,
        },
      },
    },
  });

  if (!impersonatedUser) {
    throw new Error("This user does not exist");
  }

  return impersonatedUser;
}

const ImpersonationProvider = CredentialsProvider({
  id: "impersonation-auth",
  name: "Impersonation",
  type: "credentials",
  credentials: {
    username: { type: "text" },
    teamId: { type: "text" },
  },
  async authorize(creds, req) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore need to figure out how to correctly type this
    const session = await getSession({ req });
    const teamId = parseTeamId(creds);
    checkSelfImpersonation(session, creds);
    checkUserIdentifier(creds);
    checkPermission(session);

    const impersonatedUser = await getImpersonatedUser({ session, teamId, creds });

    if (session?.user.role === "ADMIN") {
      if (impersonatedUser.disableImpersonation) {
        throw new Error("This user has disabled Impersonation.");
      }
      return auditAndReturnNextUser(
        impersonatedUser,
        session?.user.id as number,
        impersonatedUser.teams.length > 0 // If the user has any teams, they belong to an active team and we can set the hasActiveTeam ctx to true
      );
    }

    if (!teamId) throw new Error("You do not have permission to do this.");

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
                  in: ["ADMIN", "OWNER"],
                },
              },
              {
                team: {
                  id: teamId,
                },
              },
            ],
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (sessionUserFromDb?.teams.length === 0 || impersonatedUser.teams.length === 0) {
      throw new Error("You do not have permission to do this.");
    }

    // We find team by ID so we know there is only one team in the array
    if (sessionUserFromDb?.teams[0].role === "ADMIN" && impersonatedUser.teams[0].role === "OWNER") {
      throw new Error("You do not have permission to do this.");
    }

    return auditAndReturnNextUser(
      impersonatedUser,
      session?.user.id as number,
      impersonatedUser.teams.length > 0 // If the user has any teams, they belong to an active team and we can set the hasActiveTeam ctx to true
    );
  },
});

export default ImpersonationProvider;
