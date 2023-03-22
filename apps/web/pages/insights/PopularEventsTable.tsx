import { Card, Title, Table, TableBody, TableCell, TableRow, Text } from "@tremor/react";

import { trpc } from "@calcom/trpc";

import { useFilterContext } from "./UseFilterContext";

const PopularEventsTable = () => {
  const { filter } = useFilterContext();
  const { dateRange } = filter;
  const { startDate, endDate } = dateRange;
  const { selectedTeamId: teamId } = filter;

  if (!startDate || !endDate || !teamId) return null;

  const { data, isSuccess } = trpc.viewer.analytics.popularEventTypes.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
  });
  return (
    <Card>
      <Title>Popular Events</Title>
      <Table className="mt-5">
        <TableBody>
          {isSuccess ? (
            data?.map((item) => (
              <TableRow key={item.eventTypeId}>
                <TableCell>{item.eventTypeName}</TableCell>
                <TableCell>
                  <Text>
                    <strong>{item.count}</strong>
                  </Text>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell>No event types found</TableCell>
              <TableCell>
                <strong>0</strong>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

export { PopularEventsTable };
