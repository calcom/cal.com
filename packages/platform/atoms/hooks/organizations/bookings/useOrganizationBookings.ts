import { useQuery } from "@tanstack/react-query";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { GetBookingsOutput_2024_08_13, GetOrganizationsBookingsInput } from "@calcom/platform-types";

import http from "../../../lib/http";
import { extractBookingsQueryKeys } from "../../bookings/useBookings";
import { useAtomsContext } from "../../useAtomsContext";

export const QUERY_KEY = "use-organization-bookings";

export const useOrganizationBookings = (query: GetOrganizationsBookingsInput) => {
  const { organizationId } = useAtomsContext();

  const pathname = `/organizations/${organizationId}/bookings`;

  const organizationBookingsQuery = useQuery({
    queryKey: [QUERY_KEY, ...extractOrganizationBookingsQueryKeys(query)],
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

  return organizationBookingsQuery;
};

function extractOrganizationBookingsQueryKeys(query: GetOrganizationsBookingsInput) {
  return [...extractBookingsQueryKeys(query), query.userIds];
}
