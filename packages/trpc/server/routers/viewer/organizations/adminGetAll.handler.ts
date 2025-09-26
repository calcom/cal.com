import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetAllInput } from "./adminGetAll.schema";

type AdminGetAllOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetAllInput;
};

export const adminGetAllHandler = async ({ input }: AdminGetAllOptions) => {
  const { take, skip, orderBy, sortOrder } = input;

  const [allOrgs, totalCount] = await Promise.all([
    prisma.team.findMany({
      where: {
        isOrganization: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        metadata: true,
        organizationSettings: true,
        createdAt: true,
        members: {
          where: {
            role: "OWNER",
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        [orderBy]: sortOrder,
      },
      take,
      skip,
    }),
    prisma.team.count({
      where: {
        isOrganization: true,
      },
    }),
  ]);

  const organizations = allOrgs
    .map((org) => {
      const parsed = teamMetadataSchema.safeParse(org.metadata);
      if (!parsed.success) {
        console.error(`Failed to parse metadata for org ${org.id}:`, safeStringify(parsed.error));
        return null;
      }
      return { ...org, metadata: parsed.data };
    })
    .filter((org): org is NonNullable<typeof org> => org !== null);

  return {
    organizations,
    totalCount,
  };
};

export default adminGetAllHandler;
