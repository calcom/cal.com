import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";

export function FailedBookingsByField() {
  const { filter } = useFilterContext();
  const { dateRange, selectedTeamId, isAll, initialConfig, selectedRoutingFormId } = filter;
  const initialConfigIsReady = !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll);

  const { data } = trpc.viewer.insights.failedBookingsByField.useQuery(
    {
      teamId: selectedTeamId ?? undefined,
      isAll: !!isAll,
      routingFormId: selectedRoutingFormId ?? undefined,
    },
    {
      enabled: initialConfigIsReady,
    }
  );

  return <div>FailedBookingsByField</div>;
}
