import { PrismaAttributeRepository } from "@calcom/lib/server/repository/PrismaAttributeRepository";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const listHandler = async (opts: GetOptions) => {
  const org = opts.ctx.user.organization;

  if (!org.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You need to be apart of an organization to use this feature",
    });
  }

  return await PrismaAttributeRepository.findAllByOrgIdWithOptions({ orgId: org.id });
};

export default listHandler;
