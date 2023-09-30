import type { Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import { getSession } from "@calcom/features/auth/lib/getSession";
import { parseOrgData } from "@calcom/features/ee/organizations/lib/orgDomains";
import { parseProfileData, profileSelect } from "@calcom/features/ee/profiles/lib/profileUtils";
import prisma from "@calcom/prisma";

const userIdschema = z.object({
  userId: z.preprocess((a) => parseInt(z.string().parse(a), 10), z.number().positive()),
});

type Credentials = Record<"userId", string> | undefined;

export function parseUserId(creds: Partial<Credentials>) {
  return creds?.userId ? userIdschema.parse({ userId: creds.userId }).userId : undefined;
}

export async function checkPermission(session: Session, userId: number) {
  const currentUser = await prisma.user.findUnique({
    where: { id: session?.user.id },
    select: { ...profileSelect() },
  });
  const profiles = parseProfileData(currentUser, session.user);
  if (!profiles?.map((user) => user.id).includes(userId)) {
    throw new Error("You do not have permission to do this.");
  }
}

const ProfileProvider = CredentialsProvider({
  id: "profile-auth",
  name: "Profile",
  type: "credentials",
  credentials: {
    userId: { type: "text" },
  },
  async authorize(creds, req) {
    const session = await getSession({ req });
    if (!session) return null;
    const userId = parseUserId(creds);
    if (!userId) throw new Error("User identifier must be present");
    await checkPermission(session, userId);

    // Get user to switch profile to
    const newProfileUser = await prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        email: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            metadata: true,
          },
        },
        disableImpersonation: true,
        locale: true,
        ...profileSelect(),
        teams: {
          where: {
            disableImpersonation: false, // Ensure they have impersonation enabled
            accepted: true, // Ensure they are apart of the team and not just invited.
          },
          select: {
            teamId: true,
            disableImpersonation: true,
            role: true,
          },
        },
      },
    });

    if (!newProfileUser) {
      throw new Error("This user does not exist");
    }

    return {
      id: newProfileUser.id,
      username: newProfileUser.username,
      email: newProfileUser.email,
      name: newProfileUser.name,
      role: newProfileUser.role,
      belongsToActiveTeam: newProfileUser.teams.length > 0,
      organizationId: newProfileUser.organizationId,
      org: parseOrgData(newProfileUser.organization),
      locale: newProfileUser.locale,
    };
  },
});

export default ProfileProvider;
