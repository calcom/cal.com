import { Table, TableBody, TableCell, TableRow, Text, Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useFilterContext } from "../context/provider";
import { CardInsights } from "./Card";
import { LoadingInsight } from "./LoadingInsights";

export const PopularEventsTable = () => {
  const { t } = useLocale();
  const { filter } = useFilterContext();
  const { dateRange, selectedMemberUserId, selectedUserId } = filter;
  const [startDate, endDate] = dateRange;
  const { selectedTeamId: teamId } = filter;

  const { data, isSuccess, isLoading } = trpc.viewer.insights.popularEventTypes.useQuery(
    {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      teamId: teamId ?? undefined,
      userId: selectedUserId ?? undefined,
      memberUserId: selectedMemberUserId ?? undefined,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isLoading) return <LoadingInsight />;

  if (!isSuccess || !startDate || !endDate || (!teamId && !selectedUserId)) return null;

  return (
    <CardInsights>
      <Title className="text-emphasis">{t("popular_events")}</Title>
      <Table className="mt-5">
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.eventTypeId}>
              <TableCell className="text-default">{item.eventTypeName}</TableCell>
              <TableCell>
                <Text className="text-default text-right">
                  <strong>{item.count}</strong>
                </Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length === 0 && (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
        </div>
      )}
    </CardInsights>
  );
};
