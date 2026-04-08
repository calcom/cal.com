import { enrichUserWithDelegationCredentialsIncludeServiceAccountKey } from "@calcom/app-store/delegationCredential";
import dayjs from "@calcom/dayjs";
import { getUserAvailabilityService } from "@calcom/features/di/containers/GetUserAvailability";
import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import { isTeamMember } from "@calcom/features/ee/teams/lib/queries";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";

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
  const membershipRepository = getMembershipRepository();
  const members = await membershipRepository.findByTeamIdForAvailability({ teamId: input.teamId });

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
      browsingWindowStart: dayjsDateFrom,
      browsingWindowEnd: dayjsDateTo,
      returnDateOverrides: true,
      bypassBusyCalendarTimes: false,
    },
    { user, busyTimesFromLimitsBookings: [] }
  );
};

export default getMemberAvailabilityHandler;
