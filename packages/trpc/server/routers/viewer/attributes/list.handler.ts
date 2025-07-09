import { AttributeRepository } from "@calcom/lib/server/repository/attribute";

import type { TrpcSessionUser } from "../../../types";
import { assertOrgMember } from "./utils";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

const listHandler = async ({ ctx: { user: authedUser } }: GetOptions) => {
  // assert authenticated user is part of an organization
  assertOrgMember(authedUser);
  return await AttributeRepository.findAllByOrgIdWithOptions({ orgId: authedUser.profile.organizationId });
};

export default listHandler;
