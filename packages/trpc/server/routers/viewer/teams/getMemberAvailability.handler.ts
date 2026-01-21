import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import { isTeamMember } from "@calcom/features/ee/teams/lib/queries";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";
import dayjs from "@calcom/dayjs";

type GetMemberAvailabilityOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetMemberAvailabilityInputSchema;
};

export const getMemberAvailabilityHandler = async ({ ctx, input }: GetMemberAvailabilityOptions) => {
  const userAvailabilityService = getUserAvailabilityService();
  const team = await isTeamMember(ctx.user?.id, input.teamId);
  if (!team) throw new TRPCError({ code: "UNAUTHORIZED" });

  // verify member is in team
  const members = await MembershipRepository.findByTeamIdForAvailability({ teamId: input.teamId });

  const member = members?.find((m) => m.userId === input.memberId);
  if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
  if (!member.user.username)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Member doesn't have a username" });
  const username = member.user.username;
  const user = await enrichUserWithDelegationCredentialsIncludeServiceAccountKey({
    user: member.user,
  });

  const dayjsDateFrom = dayjs(input.dateFrom);
  const dayjsDateTo = dayjs(input.dateTo);

  if (!dayjsDateFrom.isValid() || !dayjsDateTo.isValid()) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid date range" });
  }

  // get availability for this member
  return await userAvailabilityService.getUserAvailability(
    {
      username: username,
      dateFrom: dayjsDateFrom,
      dateTo: dayjsDateTo,
      returnDateOverrides: true,
      bypassBusyCalendarTimes: false,
    },
    { user, busyTimesFromLimitsBookings: [] }
  );
};

export default getMemberAvailabilityHandler;
