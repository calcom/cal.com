import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type ProfilesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const profilesHandler = async ({ ctx }: ProfilesOptions) => {
  const { user: sessionUser } = ctx;

  const allUserEnrichedProfiles =
    await ProfileRepository.findAllProfilesForUserIncludingMovedUser(sessionUser);

  return {
    profiles: allUserEnrichedProfiles,
  };
};

export default profilesHandler;
