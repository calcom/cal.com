import type { Session } from "next-auth";

import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const platformMeHandler = async ({ ctx: { user: authedUser } }: MeOptions) => {
  const allUserEnrichedProfiles = await ProfileRepository.findAllProfilesForUserIncludingMovedUser(
    authedUser
  );

  const mainProfile =
    allUserEnrichedProfiles.find((profile) => authedUser.movedToProfileId === profile.id) ||
    allUserEnrichedProfiles[0];

  return {
    id: authedUser.id,
    username: authedUser.username,
    email: authedUser.email,
    timeFormat: authedUser.timeFormat,
    timeZone: authedUser.timeZone,
    defaultScheduleId: authedUser.defaultScheduleId,
    weekStart: authedUser.weekStart,
    organizationId: mainProfile.organizationId,
    organization: {
      isPlatform: mainProfile.organization?.isPlatform ?? false,
      id: mainProfile.organizationId ?? null,
    },
  };
};
