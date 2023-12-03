import Banner from "@pages/wrapped/banner";

import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/MainLayout";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import PageWrapper from "@components/PageWrapper";

import Card from "./card";
import Mask from "./mask";
import TeamCard from "./teamCard";

export default function WrapperPage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  const userID = user?.id;
  const userName = user?.name;

  const endDate = dayjs().utc().endOf("year");
  const startDate = endDate.startOf("year");
  const endDateStr = endDate.toISOString();
  const startDateStr = startDate.toISOString();
  const currentYear = dayjs().year().toString();

  const { data, isSuccess, isLoading } = trpc.viewer.insights.AllBookingsForMember.useQuery(
    {
      startDate: startDateStr,
      endDate: endDateStr,
      userId: userID,
    },
    {
      staleTime: 30000,
      trpc: {
        context: { skipBatch: true },
      },
    }
  );
  const { data: teamsQuery, isLoading: isLoadingProfiles } = trpc.viewer.teamsAndUserProfilesQuery.useQuery();

  let totalBookings: number | undefined;
  let cancelledPercentage: number | undefined;
  let rescheduledPercentage: number | undefined;
  let acceptedPercentage: number | undefined;
  let bookedHours: number | undefined;
  let bookedMins: number | undefined;
  let totalEventLength: number | undefined;
  let teamNames: (string | null)[] | undefined;
  let teamNamesString: string | undefined;
  let mostCommonEventTypeId: string | undefined;
  let maxCount = 0;
  let teamCards;

  if (data != undefined && data.length > 0) {
    let cancelledCount = 0;
    let acceptedCount = 0;
    let rescheduledCount = 0;

    data.forEach((item) => {
      if (item.status === "CANCELLED" && item.timeStatus !== "rescheduled") {
        cancelledCount++;
      }
      if (item.timeStatus === "rescheduled") {
        rescheduledCount++;
      }
      if (item.status === "ACCEPTED") {
        acceptedCount++;
      }
    });

    totalBookings = cancelledCount + acceptedCount;
    cancelledPercentage = (cancelledCount / totalBookings) * 100;
    rescheduledPercentage = (rescheduledCount / totalBookings) * 100;
    acceptedPercentage = (acceptedCount / totalBookings) * 100;

    totalEventLength = data
      .map((item) => {
        // Access the eventLength property of each item
        const eventLength: number = item.eventLength || 0;
        return eventLength;
      })
      .reduce((acc, length) => acc + length, 0); // Use reduce to calculate the total event length
    bookedHours = Math.floor(totalEventLength / 60);
    bookedMins = totalEventLength % 60;

    const eventTypeCounts: { [key: number]: number } = {};
    data.forEach((item) => {
      const eventTypeId = item.eventTypeId;
      if (typeof eventTypeId === "number") {
        eventTypeCounts[eventTypeId] = (eventTypeCounts[eventTypeId] || 0) + 1;
      }
    });

    // Find the most common eventTypeId
    for (const eventType in eventTypeCounts) {
      if (eventTypeCounts[eventType] > maxCount) {
        maxCount = eventTypeCounts[eventType];
        mostCommonEventTypeId = eventType;
      }
    }

    const teamsFromIndex1 = teamsQuery.slice(1);
    teamNames = teamsFromIndex1.map((team) => team.name);
    teamNamesString = teamNames.join(", ");

    const randomThemeIdx = () => Math.floor(Math.random() * 4) + 1;

    teamCards = teamNames.map((str) => <TeamCard key={str} content={str} themeIdx={randomThemeIdx()} />);
  }

  const totalMeetingTime = `${bookedHours} hours and ${bookedMins} minutes`;

  return (
    <div className="relative overflow-hidden">
      <ShellMain heading="Insights" subtitle={t("insights_subtitle")}>
        <div className="flex w-full flex-col space-y-8 p-2">
          <div className="h-32 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
            <h1 className="font-cal ml-10 mt-10 text-[48px] text-white">Your {currentYear} in numbers</h1>
          </div>

          <div className="h-[650px] w-full space-y-8 overflow-scroll overscroll-none pt-5">
            <Banner content="STATISTICS" />
            <div className="flex w-full flex-row space-x-5">
              <Card content="Meetings booked" numbers={totalBookings} unit="" themeIdx="1" />
              <Card content="Time in meetings" numbers={bookedHours} unit="hours" themeIdx="2" />
            </div>

            <div className="flex w-full flex-row space-x-5">
              <Card content="Cancelled" numbers={cancelledPercentage} unit="%" themeIdx="3" />
              <Card content="Rescheduled" numbers={rescheduledPercentage} unit="%" themeIdx="4" />
              <Card content="Accepted" numbers={acceptedPercentage} unit="%" themeIdx="2" />
            </div>
            <Banner content={`Teams you were a part of in ${currentYear}`} />
            <div className="flex w-full flex-row space-x-5">{teamCards}</div>
          </div>
        </div>
      </ShellMain>
      <Mask />
    </div>
  );
}

WrapperPage.PageWrapper = PageWrapper;
WrapperPage.getLayout = getLayout;

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
