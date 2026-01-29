import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";

export function useHasPaidPlan() {
  if (IS_SELF_HOSTED) return { isPending: false, hasPaidPlan: true };

  // Use the consolidated billingStatus endpoint for team plan info
  const { data: billingData, isPending: isPendingBillingQuery } = trpc.viewer.teams.billingStatus.useQuery();

  // Use the focused premium query instead of full me.get
  const { data: premiumData, isPending: isPendingPremiumQuery } = trpc.viewer.me.premium.useQuery();

  const isPending = isPendingBillingQuery || isPendingPremiumQuery;

  const isCurrentUsernamePremium = premiumData?.isPremium ?? false;

  const hasPaidPlan = billingData?.hasTeamPlan || isCurrentUsernamePremium;

  return { isPending, hasPaidPlan, plan: billingData?.plan };
}

export function useTeamInvites() {
  // Use the optimized inviteCount endpoint instead of full listInvites
  const inviteCount = trpc.viewer.teams.inviteCount.useQuery();

  return { isPending: inviteCount.isPending, count: inviteCount.data?.count ?? 0 };
}

export function useHasTeamMembership() {
  const { data, isPending } = trpc.viewer.teams.hasTeamMembership.useQuery();

  return { isPending, hasTeamMembership: data?.hasTeamMembership ?? false };
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
