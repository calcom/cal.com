import { Card, Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { TotalBookingUsersTable } from "./TotalBookingUsersTable";

export const MostBookedTeamMembersTable = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange, selectedEventTypeId } = filter;
  const [startDate, endDate] = dateRange;
  const { selectedTeamId: teamId } = filter;

  const { data, isSuccess } = trpc.viewer.insights.membersWithMostBookings.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
    eventTypeId: selectedEventTypeId ?? undefined,
  });

  if (!isSuccess || !startDate || !endDate || !teamId) return null;

  return (
    <Card>
      <Title>{t("most_booked_members")}</Title>
      <TotalBookingUsersTable data={data} />
    </Card>
  );
};
