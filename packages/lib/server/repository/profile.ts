import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";

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
