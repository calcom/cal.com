import { Card, Title } from "@tremor/react";

import { trpc } from "@calcom/trpc";

import { useFilterContext } from "./UseFilterContext";
import { TotalBookingUsersTable } from "./components/TotalBookingUsersTable";

const MostBookedTeamMembersTable = () => {
  const { filter } = useFilterContext();
  const { dateRange } = filter;
  const { startDate, endDate } = dateRange;
  const { selectedTeamId: teamId } = filter;

  if (!startDate || !endDate || !teamId) return null;

  const { data, isSuccess } = trpc.viewer.analytics.membersWithMostBookings.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });
  return (
    <Card>
      <Title>Most Booked Members</Title>
      <TotalBookingUsersTable isSuccess={isSuccess} data={data} />
    </Card>
  );
};

export { MostBookedTeamMembersTable };
