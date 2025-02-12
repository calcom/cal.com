import { Table, TableBody, TableCell, TableRow, Text, Title } from "@tremor/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { useInsightsParameters } from "../hooks/useInsightsParameters";
import { CardInsights } from "./Card";
import { LoadingInsight } from "./LoadingInsights";

export const PopularEventsTable = () => {
  const { t } = useLocale();
  const { isAll, teamId, userId, memberUserId, startDate, endDate, eventTypeId } = useInsightsParameters();

  const { data, isSuccess, isPending } = trpc.viewer.insights.popularEventTypes.useQuery(
    {
      startDate,
      endDate,
      teamId,
      userId,
      eventTypeId,
      memberUserId,
      isAll,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isPending) return <LoadingInsight />;

  if (!isSuccess || !data) return null;

  return (
    <CardInsights>
      <Title className="text-emphasis">{t("popular_events")}</Title>
      <Table className="mt-5">
        <TableBody>
          {data.map(
            (item) =>
              item.eventTypeId && (
                <TableRow key={item.eventTypeId}>
                  <TableCell className="text-default">{item.eventTypeName}</TableCell>
                  <TableCell>
                    <Text className="text-default text-right">
                      <strong>{item.count}</strong>
                    </Text>
                  </TableCell>
                </TableRow>
              )
          )}
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
