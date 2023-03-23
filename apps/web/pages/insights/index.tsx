import { useState } from "react";

import dayjs from "@calcom/dayjs";
import {
  AverageEventDurationChart,
  BookingKPICards,
  BookingStatusLineChart,
  LeastBookedTeamMembersTable,
  MostBookedTeamMembersTable,
  PopularEventsTable,
} from "@calcom/features/insights/components";
import type { FilterContextType } from "@calcom/features/insights/context/provider";
import { FilterProvider } from "@calcom/features/insights/context/provider";
import { Filters } from "@calcom/features/insights/filters";
import Shell from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, ButtonGroup } from "@calcom/ui";
import { FiRefreshCcw, FiUserPlus, FiUsers } from "@calcom/ui/components/icon";

export default function InsightsPage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();
  const features = [
    {
      icon: <FiUsers className="h-5 w-5 text-red-500" />,
      title: t("view_bookings_across"),
      description: t("view_bookings_across_description"),
    },
    {
      icon: <FiRefreshCcw className="h-5 w-5 text-blue-500" />,
      title: t("identify_booking_trends"),
      description: t("identify_booking_trends_description"),
    },
    {
      icon: <FiUserPlus className="h-5 w-5 text-green-500" />,
      title: t("spot_popular_event_types"),
      description: t("spot_popular_event_types_description"),
    },
  ];

  const [dateRange, setDateRange] = useState<FilterContextType["filter"]["dateRange"]>([
    dayjs().subtract(1, "month"),
    dayjs(),
    "t",
  ]);

  const [selectedTimeView, setSelectedTimeView] =
    useState<FilterContextType["filter"]["selectedTimeView"]>("week");
  const [selectedUserId, setSelectedUserId] = useState<FilterContextType["filter"]["selectedUserId"]>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<FilterContextType["filter"]["selectedTeamId"]>(null);
  const [selectedEventTypeId, setSelectedEventTypeId] =
    useState<FilterContextType["filter"]["selectedEventTypeId"]>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterContextType["filter"]["selectedFilter"]>(null);
  const [selectedTeamName, setSelectedTeamName] =
    useState<FilterContextType["filter"]["selectedTeamName"]>(null);

  return (
    <div>
      <Shell>
        <UpgradeTip
          title={t("make_informed_decisions")}
          description={t("make_informed_decisions_description")}
          features={features}
          background="/banners/insights.jpg"
          buttons={
            <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
              <ButtonGroup>
                <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                  {t("create_team")}
                </Button>
                <Button color="secondary" href="https://go.cal.com/insights" target="_blank">
                  {t("learn_more")}
                </Button>
              </ButtonGroup>
            </div>
          }>
          {!user ? (
            <></>
          ) : (
            <FilterProvider
              value={{
                filter: {
                  dateRange,
                  selectedTimeView,
                  selectedUserId,
                  selectedTeamId,
                  selectedTeamName,
                  selectedEventTypeId,
                  selectedFilter,
                },
                setSelectedFilter: (filter) => setSelectedFilter(filter),
                setDateRange: (dateRange) => setDateRange(dateRange),
                setSelectedTimeView: (selectedTimeView) => setSelectedTimeView(selectedTimeView),
                setSelectedUserId: (selectedUserId) => setSelectedUserId(selectedUserId),
                setSelectedTeamId: (selectedTeamId) => setSelectedTeamId(selectedTeamId),
                setSelectedTeamName: (selectedTeamName) => setSelectedTeamName(selectedTeamName),
                setSelectedEventTypeId: (selectedEventTypeId) => setSelectedEventTypeId(selectedEventTypeId),
              }}>
              <div className="mb-4 ml-auto flex w-full flex-wrap justify-between lg:flex-nowrap">
                <div className="min-w-52">
                  <p className="text-lg font-semibold">
                    {t("analytics_for_organisation", { organisationName: selectedTeamName })}
                  </p>
                  <p>{t("subtitle_analytics")}</p>
                </div>
                <Filters />
              </div>
              <div className="mb-4 space-y-6">
                <BookingKPICards />

                <BookingStatusLineChart />

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <PopularEventsTable />

                  <AverageEventDurationChart />
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <MostBookedTeamMembersTable />
                  <LeastBookedTeamMembersTable />
                </div>
                <small className="block text-center text-gray-600">
                  {t("looking_for_more_analytics")}
                  <a
                    className="text-blue-500 hover:underline"
                    href="mailto:updates@cal.com?subject=Feature%20Request%3A%20More%20Analytics&body=Hey%20Cal.com%20Team%2C%20I%20love%20the%20analytics%20page%20but%20I%20am%20looking%20for%20...">
                    {" "}
                    {t("contact_support")}
                  </a>
                </small>
              </div>
            </FilterProvider>
          )}
        </UpgradeTip>
      </Shell>
    </div>
  );
}
