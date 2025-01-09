import { OrganizationRepository } from "@calcom/lib/server/repository/organization";

import type { TrpcSessionUser } from "../../../trpc";
import type { TCheckAvailableSlug } from "./checkAvailableSlug.schema";

type CheckAvailableSlugOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCheckAvailableSlug;
};

export const checkAvailableSlugHandler = async ({ input }: CheckAvailableSlugOptions) => {
  return await OrganizationRepository.checkSlugIsAvailable({ slug: input.slug });
};

export default checkAvailableSlugHandler;
