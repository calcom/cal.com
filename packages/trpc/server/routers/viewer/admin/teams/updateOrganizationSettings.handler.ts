import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import type { TUpdateOrganizationSettingsSchema } from "./updateOrganizationSettings.schema";

type UpdateOrganizationSettingsOptions = {
  ctx: {
    user: TrpcSessionUser;
    prisma: PrismaClient;
  };
  input: TUpdateOrganizationSettingsSchema;
};

export default async function handler({ ctx, input }: UpdateOrganizationSettingsOptions) {
  const { prisma } = ctx;
  const { teamId, data } = input;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { isOrganization: true },
  });

  if (!team) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team not found",
    });
  }

  if (!team.isOrganization) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Team is not an organization",
    });
  }

  const organizationSettings = await prisma.organizationSettings.upsert({
    where: { organizationId: teamId },
    update: data,
    create: {
      organizationId: teamId,
      orgAutoAcceptEmail: data.orgAutoAcceptEmail || "",
      ...data,
    },
  });

  return organizationSettings;
}
