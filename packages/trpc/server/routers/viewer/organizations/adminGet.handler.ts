import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TAdminGet } from "./adminGet.schema";

type AdminGetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGet;
};

export const adminGetHandler = async ({ input }: AdminGetOptions) => {
  const org = await prisma.team.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      metadata: true,
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

  if (!org) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }
  const parsedMetadata = teamMetadataSchema.parse(org.metadata);
  if (!parsedMetadata?.isOrganization) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }
  return { ...org, metadata: parsedMetadata };
};

export default adminGetHandler;
