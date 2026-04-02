import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { GetSchedulesOutput_2024_06_11 } from "@calcom/platform-types";
import { useQuery } from "@tanstack/react-query";
import { useAtomsContext } from "../../hooks/useAtomsContext";
import http from "../../lib/http";

export const QUERY_KEY = "use-atom-host-schedule-by-id";

export const useAtomHostSchedules = ({ userId, teamId }: { userId: number; teamId?: number }) => {
  const { organizationId, userId: meId } = useAtomsContext();

  const event = useQuery({
    queryKey: [QUERY_KEY, organizationId, userId],
    queryFn: async () => {
      const pathname = `/organizations/${organizationId}/teams/${teamId}/users/${userId}/schedules`;
      return http?.get<GetSchedulesOutput_2024_06_11>(pathname).then((res) => {
        if (res.data.status === SUCCESS_STATUS) {
          const schedules = res.data.data.map((schedule) => ({
            id: schedule.id,
            name: schedule.name,
            isDefault: schedule.isDefault,
            userId: schedule.ownerId,
            readOnly: meId !== userId,
          }));
          return { schedules };
        }
        throw new Error(res.data?.error?.message ?? "Error while getting host schedules");
      });
    },
    enabled: !!organizationId && !!teamId && !!userId,
  });

  return event;
};
