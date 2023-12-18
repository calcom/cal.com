import { getLayout } from "@calcom/features/MainLayout";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import {
  AverageEventDurationChart,
  BookingKPICards,
  BookingStatusLineChart,
  LeastBookedTeamMembersTable,
  MostBookedTeamMembersTable,
  PopularEventsTable,
} from "@calcom/features/insights/components";
import { FiltersProvider } from "@calcom/features/insights/context/FiltersProvider";
import { Filters } from "@calcom/features/insights/filters";
import { ShellMain } from "@calcom/features/shell/Shell";
import { UpgradeTip } from "@calcom/features/tips";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Button, ButtonGroup } from "@calcom/ui";
import { RefreshCcw, UserPlus, Users } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export default function InsightsPage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  const features = [
    {
      icon: <Users className="h-5 w-5" />,
      title: t("view_bookings_across"),
      description: t("view_bookings_across_description"),
    },
    {
      icon: <RefreshCcw className="h-5 w-5" />,
      title: t("identify_booking_trends"),
      description: t("identify_booking_trends_description"),
    },
    {
      icon: <UserPlus className="h-5 w-5" />,
      title: t("spot_popular_event_types"),
      description: t("spot_popular_event_types_description"),
    },
  ];

  return (
    <div>
      <ShellMain heading="Insights" subtitle={t("insights_subtitle")}>
        <UpgradeTip
          plan="team"
          title={t("make_informed_decisions")}
          description={t("make_informed_decisions_description")}
          features={features}
          background="/tips/insights"
          buttons={
            <div className="space-y-2 rtl:space-x-reverse sm:space-x-2">
              <ButtonGroup>
                <Button color="primary" href={`${WEBAPP_URL}/settings/teams/new`}>
                  {t("create_team")}
                </Button>
                <Button color="minimal" href="https://go.cal.com/insights" target="_blank">
                  {t("learn_more")}
                </Button>
              </ButtonGroup>
            </div>
          }>
          {!user ? (
            <></>
          ) : (
            <FiltersProvider>
              <Filters />

              <div className="mb-4 space-y-4">
                <BookingKPICards />

                <BookingStatusLineChart />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <PopularEventsTable />

                  <AverageEventDurationChart />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <MostBookedTeamMembersTable />
                  <LeastBookedTeamMembersTable />
                </div>
                <small className="text-default block text-center">
                  {t("looking_for_more_insights")}{" "}
                  <a
                    className="text-blue-500 hover:underline"
                    href="mailto:updates@cal.com?subject=Feature%20Request%3A%20More%20Analytics&body=Hey%20Cal.com%20Team%2C%20I%20love%20the%20analytics%20page%20but%20I%20am%20looking%20for%20...">
                    {" "}
                    {t("contact_support")}
                  </a>
                </small>
              </div>
            </FiltersProvider>
          )}
        </UpgradeTip>
      </ShellMain>
    </div>
  );
}

InsightsPage.PageWrapper = PageWrapper;
InsightsPage.getLayout = getLayout;

// If feature flag is disabled, return not found on getServerSideProps
export const getServerSideProps = async () => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);

  if (flags.insights === false) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
};
