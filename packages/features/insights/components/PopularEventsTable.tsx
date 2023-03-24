import { Card, Title, Table, TableBody, TableCell, TableRow, Text } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";

export const PopularEventsTable = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange, selectedUserId } = filter;
  const [startDate, endDate] = dateRange;
  const { selectedTeamId: teamId } = filter;

  const { data, isSuccess } = trpc.viewer.insights.popularEventTypes.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    teamId,
    userId: selectedUserId ?? undefined,
  });

  if (!startDate || !endDate || !teamId) return null;

  return (
    <Card>
      <Title>{t("popular_events")}</Title>
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
              <TableCell>{t("no_event_types_found")}</TableCell>
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
