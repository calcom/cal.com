import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { GetBookingsInput_2024_08_13, GetBookingsOutput_2024_08_13 } from "@calcom/platform-types";

import http from "../../../lib/http";
import { extractBookingsQueryKeys } from "../../bookings/useBookings";
import { useAtomsContext } from "../../useAtomsContext";

export const QUERY_KEY = "use-organization-user-bookings";

export const useOrganizationUserBookings = (userId: number, query: GetBookingsInput_2024_08_13) => {
  const { organizationId } = useAtomsContext();

  const pathname = `/organizations/${organizationId}/users/${userId}/bookings`;

  const organizationUserBookingsQuery = useQuery({
    queryKey: [QUERY_KEY, userId, ...extractBookingsQueryKeys(query)],
    queryFn: async () => {
      return http
        .get<GetBookingsOutput_2024_08_13>(pathname, {
          params: query,
        })
        .then((res) => {
          if (res.data.status === SUCCESS_STATUS) {
            return res.data.data;
          }
          throw new Error(res.data?.error?.message);
        });
    },
  });

  return organizationUserBookingsQuery;
};
