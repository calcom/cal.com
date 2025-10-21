import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import hasKeyInMetadata from "@calcom/lib/hasKeyInMetadata";
import { trpc } from "@calcom/trpc/react";

export function useHasPaidPlan() {
  if (IS_SELF_HOSTED) return { isPending: false, hasPaidPlan: true };

  const { data, isPending: isPendingTeamQuery } = trpc.viewer.teams.hasTeamPlan.useQuery();

  const { data: user, isPending: isPendingUserQuery } = trpc.viewer.me.get.useQuery();

  const isPending = isPendingTeamQuery || isPendingUserQuery;

  const isCurrentUsernamePremium =
    user && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

  const hasPaidPlan = data?.hasTeamPlan || isCurrentUsernamePremium;

  return { isPending, hasPaidPlan, plan: data?.plan };
}

export function useTeamInvites() {
  const listInvites = trpc.viewer.teams.listInvites.useQuery();

  return { isPending: listInvites.isPending, listInvites: listInvites.data };
}

export function useHasTeamPlan() {
  const { data: hasTeamPlan, isPending } = trpc.viewer.teams.hasTeamPlan.useQuery();

  return { isPending, hasTeamPlan: hasTeamPlan?.hasTeamPlan };
}

export function useHasEnterprisePlan() {
  // TODO: figure out how to get "has Enterprise / has Org" from the backend
  const { data: hasTeamPlan, isPending } = trpc.viewer.teams.hasTeamPlan.useQuery();

  return { isPending, hasTeamPlan: hasTeamPlan?.hasTeamPlan };
}

export function useHasActiveTeamPlan() {
  if (IS_SELF_HOSTED) return { isPending: false, hasActiveTeamPlan: true, isTrial: false };

  const { data, isPending } = trpc.viewer.teams.hasActiveTeamPlan.useQuery();

  return { isPending, hasActiveTeamPlan: !!data?.isActive, isTrial: !!data?.isTrial };
}
export function useHasActiveTeamPlanAsOwner() {
  if (IS_SELF_HOSTED) return { isPending: false, hasActiveTeamPlan: true, isTrial: false };

  const { data, isPending } = trpc.viewer.teams.hasActiveTeamPlan.useQuery({ ownerOnly: true });

  return { isPending, hasActiveTeamPlan: !!data?.isActive, isTrial: !!data?.isTrial };
}

export default useHasPaidPlan;
