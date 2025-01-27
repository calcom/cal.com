import { Table, TableBody, TableCell, TableRow, TableHead, Title } from "@tremor/react";

import { useFilterContext } from "@calcom/features/insights/context/provider";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import { CardInsights } from "./Card";
import { LoadingInsight } from "./LoadingInsights";

interface InsightData {
  title: string;
  createdAt?: Date;
  timeStatus: string;
  startTime?: Date;
  endTime?: Date;
  paid: boolean;
  userEmail: string;
  username: string;
}

const InsightsTableView: React.FC = () => {
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

  const columns: {
    key: keyof InsightData;
    label: string;
    format?: (value: any) => string;
  }[] = [
    { key: "title", label: t("title") },
    {
      key: "createdAt",
      label: t("booking_created_date"),
      format: (value: Date) => value?.toDateString() || "",
    },
    { key: "timeStatus", label: t("status") },
    { key: "startTime", label: t("start_time"), format: (value: Date) => value?.toDateString() || "" },
    { key: "endTime", label: t("end_time"), format: (value: Date) => value?.toDateString() || "" },
    { key: "paid", label: t("booking_paid"), format: (value: boolean) => (value ? "Yes" : "No") },
    { key: "userEmail", label: t("email_address") },
    { key: "username", label: t("username_placeholder") },
  ];

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
              {columns.map((column) => (
                <TableCell key={column.key} className="text-default text-left">
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <span className="text-default">
                      {column.format ? column.format(item[column.key]) : (item[column.key] as string)}
                    </span>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </CardInsights>
  );
};

export { InsightsTableView };
