import { Table, TableBody, TableCell, TableRow, TableHead, Title } from "@tremor/react";

import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { CardInsights } from "./Card";
import { LoadingInsight } from "./LoadingInsights";

const InsightsTableView = () => {
  const { filter } = useFilterContext();
  const { t } = useLocale();

  const { data, isSuccess, isPending } = trpc.viewer.insights.getInsightTableData.useQuery(
    {
      startDate: filter.dateRange[0].toISOString(),
      endDate: filter.dateRange[1].toISOString(),
      teamId: filter.selectedTeamId,
      userId: filter.selectedUserId,
      eventTypeId: filter.selectedEventTypeId,
      memberUserId: filter.selectedMemberUserId,
    },
    {
      staleTime: Infinity,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );

  if (isPending) return <LoadingInsight />;

  if (!isSuccess) return null;

  return (
    <CardInsights>
      <Title className="text-emphasis">{t("bookings")}</Title>
      {data.length === 0 ? (
        <div className="flex h-60 text-center">
          <p className="m-auto text-sm font-light">{t("insights_no_data_found_for_filter")}</p>
        </div>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell className="text-default text-left">{t("title")}</TableCell>
              <TableCell className="text-default text-left">{t("booking_created_date")}</TableCell>
              <TableCell className="text-default">{t("status")}</TableCell>
              <TableCell className="text-default">{t("start_time")}</TableCell>
              <TableCell className="text-default">{t("end_time")}</TableCell>
              <TableCell className="text-default">{t("booking_paid")}</TableCell>
              <TableCell className="text-default">{t("email_address")}</TableCell>
              <TableCell className="text-default">{t("username_placeholder")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                <TableCell>
                  <span className="text-default">{item.title}</span>
                </TableCell>
                <TableCell>
                  <span className="text-default">{item.createdAt?.toDateString()}</span>
                </TableCell>
                <TableCell>
                  <span className="text-default">{item.timeStatus}</span>
                </TableCell>
                <TableCell>
                  <span className="text-default">{item.startTime?.toDateString()}</span>
                </TableCell>
                <TableCell>
                  <span className="text-default">{item.endTime?.toDateString()}</span>
                </TableCell>
                <TableCell>
                  <span className="text-default">{item.paid ? "Yes" : "No"}</span>
                </TableCell>
                <TableCell>
                  <span className="text-default">{item.userEmail}</span>
                </TableCell>
                <TableCell>
                  <span className="text-default">{item.username}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardInsights>
  );
};

export { InsightsTableView };
