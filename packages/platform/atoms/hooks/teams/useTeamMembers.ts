import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";
import type { Membership, User } from "@calcom/prisma/client";
import { useQuery } from "@tanstack/react-query";
import http from "../../lib/http";
import { useAtomsContext } from "../useAtomsContext";

export const QUERY_KEY = "use-team-members";

type ResponseDataType = Membership & { user: Pick<User, "email" | "name" | "avatarUrl" | "username"> };

export const useTeamMembers = ({ teamId }: { teamId?: number }) => {
  const { organizationId } = useAtomsContext();

  const event = useQuery({
    queryKey: [QUERY_KEY, organizationId, teamId],
    queryFn: async () => {
      const pathname = `/organizations/${organizationId}/teams/${teamId}/memberships`;

      return http?.get<ApiResponse<ResponseDataType[]>>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          return (res.data as ApiSuccessResponse<ResponseDataType[]>).data;
        }
        throw new Error(res.data.error.message);
      });
    },
    enabled: !!organizationId && !!teamId,
  });

  return event;
};
