import { trpc } from "@calcom/trpc/react";

import { IS_SELF_HOSTED } from "../constants";
import hasKeyInMetadata from "../hasKeyInMetadata";

export function useHasPaidPlan() {
  if (IS_SELF_HOSTED) return { isPending: false, hasPaidPlan: true };

  const { data: hasTeamPlan, isPending: isPendingTeamQuery } = trpc.viewer.teams.hasTeamPlan.useQuery();

  const { data: user, isPending: isPendingUserQuery } = trpc.viewer.me.useQuery();

  const isPending = isPendingTeamQuery || isPendingUserQuery;

  const isCurrentUsernamePremium =
    user && hasKeyInMetadata(user, "isPremium") ? !!user.metadata.isPremium : false;

  const hasPaidPlan = hasTeamPlan?.hasTeamPlan || isCurrentUsernamePremium;

  return { isPending, hasPaidPlan };
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

export default useHasPaidPlan;
