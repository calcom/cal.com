import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";

import { HttpError } from "../../http-error";

export function createProfile({
  userId,
  organizationId,
  username,
}: {
  userId: number;
  organizationId: number;
  username: string;
}) {
  return prisma.profile.create({
    data: {
      uid: uuidv4(),
      user: {
        connect: {
          id: userId,
        },
      },
      organization: {
        connect: {
          id: organizationId,
        },
      },
      username,
    },
  });
}

export async function getProfile({ userId, organizationId }: { userId: number; organizationId: number }) {
  return await prisma.profile.findFirst({
    where: {
      userId,
      organizationId,
    },
  });
}

export async function getAllProfiles(user: { id: number; username: string | null }) {
  const allProfiles = [
    {
      username: user.username,
      name: "Personal",
      id: null as number | null,
      organization: null as { id: number; name: string } | null,
    },
    await getOrgProfiles(user),
  ];

  return allProfiles;
}

export async function getOrgProfiles(user: { id: number }) {
  const profiles = await prisma.profile.findMany({
    where: {
      userId: user.id,
    },
  });

  const allOrgProfiles: {
    username: string;
    id: number;
    name: string;
    organization: { id: number; name: string };
  }[] = [];

  for (const profile of profiles) {
    const organization = await prisma.team.findUnique({
      where: {
        id: profile.organizationId,
      },
    });
    if (!organization) {
      throw new HttpError({
        statusCode: 404,
        message: "Organization not found for the profile",
      });
    }
    allOrgProfiles.push({
      username: profile.username,
      id: profile.id,
      name: organization.name,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  }
  return allOrgProfiles;
}
