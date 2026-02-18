import type { Session } from "next-auth";

import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

type MeOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    session: Session;
  };
};

export const platformMeHandler = async ({ ctx }: MeOptions) => {
  const { user: sessionUser } = ctx;

  const allUserEnrichedProfiles =
    await ProfileRepository.findAllProfilesForUserIncludingMovedUser(sessionUser);

  const mainProfile =
    allUserEnrichedProfiles.find((profile) => sessionUser.movedToProfileId === profile.id) ||
    allUserEnrichedProfiles.find((profile) => sessionUser.organizationId === profile.organizationId) ||
    allUserEnrichedProfiles[0];

  return {
    id: sessionUser.id,
    username: sessionUser.username,
    email: sessionUser.email,
    timeFormat: sessionUser.timeFormat,
    timeZone: sessionUser.timeZone,
    defaultScheduleId: sessionUser.defaultScheduleId,
    weekStart: sessionUser.weekStart,
    organizationId: mainProfile.organizationId,
    organization: {
      isPlatform: mainProfile.organization?.isPlatform ?? false,
      id: mainProfile.organizationId ?? null,
    },
  };
};
