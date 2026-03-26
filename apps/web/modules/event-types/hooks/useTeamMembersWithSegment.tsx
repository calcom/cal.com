import { useQuery } from "@tanstack/react-query";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { trpc } from "@calcom/trpc/react";
import {
  type UseTeamMembersWithSegmentProps,
  useProcessTeamMembersData,
} from "@calcom/atoms/event-types/hooks/useTeamMembersWithSegmentPlatform";

export const useTeamMembersWithSegment = ({
  initialTeamMembers,
  assignRRMembersUsingSegment,
  teamId,
  queryValue,
  value,
}: UseTeamMembersWithSegmentProps) => {
  const { data: matchingTeamMembersWithResult, isPending } =
    trpc.viewer.attributes.findTeamMembersMatchingAttributeLogic.useQuery(
      {
        teamId: teamId || 0,
        attributesQueryValue: queryValue as AttributesQueryValue,
        _enablePerf: true,
      },
      {
        enabled: assignRRMembersUsingSegment && !!queryValue && !!teamId,
      }
    );

  const { teamMembers, localWeightsInitialValues } = useProcessTeamMembersData({
    initialTeamMembers,
    assignRRMembersUsingSegment,
    matchingTeamMembersWithResult,
    value,
  });

  return {
    teamMembers,
    localWeightsInitialValues,
    isPending,
  };
};
