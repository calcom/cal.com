import { Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { CardInsights } from "./Card";
import { LoadingInsight } from "./LoadingInsights";
import { TotalBookingUsersTable } from "./TotalBookingUsersTable";

export const LeastBookedTeamMembersTable = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange, selectedEventTypeId, selectedTeamId: teamId, isAll, initialConfig } = filter;
  const [startDate, endDate] = dateRange;

  const { data, isSuccess, isPending } = trpc.viewer.insights.membersWithLeastBookings.useQuery(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamId,
      eventTypeId: selectedEventTypeId ?? undefined,
      isAll,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
      enabled: !!(initialConfig?.teamId || initialConfig?.userId || initialConfig?.isAll),
    }
  );

  if (isPending) return <LoadingInsight />;

  if (!isSuccess || !startDate || !endDate || !teamId) return null;

  return (
    <CardInsights>
      <Title className="text-emphasis">{t("least_booked_members")}</Title>
      <TotalBookingUsersTable data={data} />
    </CardInsights>
  );
};
