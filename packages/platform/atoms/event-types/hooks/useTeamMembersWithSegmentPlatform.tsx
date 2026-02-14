import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { Host, TeamMember } from "@calcom/features/eventtypes/lib/types";
import type { AttributesQueryValue } from "@calcom/lib/raqb/types";
import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  ApiResponse,
  ApiSuccessResponse,
  TeamMemberDto,
  FindTeamMembersMatchingAttributeOutputDto,
} from "@calcom/platform-types";

import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

export interface UseTeamMembersWithSegmentProps {
  initialTeamMembers: TeamMember[];
  assignRRMembersUsingSegment: boolean;
  teamId?: number;
  orgId?: number;
  queryValue?: AttributesQueryValue | null;
  value: Host[];
}

export const useProcessTeamMembersData = ({
  initialTeamMembers,
  assignRRMembersUsingSegment,
  matchingTeamMembersWithResult,
  value,
}: {
  initialTeamMembers: TeamMember[];
  assignRRMembersUsingSegment: boolean;
  matchingTeamMembersWithResult?: { result: TeamMemberDto[] | null };
  value: Host[];
}) => {
  const teamMembers = useMemo(() => {
    if (assignRRMembersUsingSegment && matchingTeamMembersWithResult?.result) {
      return matchingTeamMembersWithResult.result.map((member) => ({
        value: member.id.toString(),
        label: member.name || member.email,
        email: member.email,
        avatar: "",
      }));
    }
    return initialTeamMembers;
  }, [assignRRMembersUsingSegment, matchingTeamMembersWithResult, initialTeamMembers]);

  const localWeightsInitialValues = useMemo(
    () =>
      teamMembers.reduce<Record<string, number>>((acc, member) => {
        const memberInValue = value.find((host) => host.userId === parseInt(member.value, 10));
        acc[member.value] = memberInValue?.weight ?? 100;
        return acc;
      }, {}),
    [teamMembers, value]
  );

  return {
    teamMembers,
    localWeightsInitialValues,
  };
};

export const useTeamMembersWithSegmentPlatform = ({
  initialTeamMembers,
  assignRRMembersUsingSegment,
  teamId,
  orgId,
  queryValue,
  value,
}: UseTeamMembersWithSegmentProps) => {
  const { isInit } = useAtomsContext();

  const pathname = `/atoms/organizations/${orgId}/teams/${teamId}/members-matching-attribute?${new URLSearchParams(
    {
      attributesQueryValue: queryValue ? JSON.stringify(queryValue) : "",
      enablePerf: "true",
    }
  )}`;

  const { data: matchingTeamMembersWithResult, isPending } = useQuery({
    queryKey: ["teamMembersMatchingAttribute", teamId, orgId, queryValue],
    queryFn: async () => {
      return http?.get<ApiResponse<FindTeamMembersMatchingAttributeOutputDto>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<FindTeamMembersMatchingAttributeOutputDto>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: isInit && !!teamId && !!orgId,
  });

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
