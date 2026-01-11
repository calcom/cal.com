import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";

type AdminGetAllOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const adminGetUnverifiedHandler = async (_opts: AdminGetAllOptions) => {
  const allOrgs = await prisma.team.findMany({
    where: {
      isOrganization: true,
      isPlatform: false,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      metadata: true,
      organizationSettings: true,
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
  });

  return allOrgs
    .map((org) => {
      const parsed = teamMetadataSchema.safeParse(org.metadata);
      if (!parsed.success) {
        console.error(`Failed to parse metadata for org ${org.id}:`, safeStringify(parsed.error));
        return null;
      }
      return { ...org, metadata: parsed.data };
    })
    .filter((org): org is NonNullable<typeof org> => org !== null);
};

export default adminGetUnverifiedHandler;
