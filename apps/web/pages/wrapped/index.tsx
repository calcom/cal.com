import Banner from "@pages/wrapped/banner";
import { motion } from "framer-motion";

import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/MainLayout";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import PageWrapper from "@components/PageWrapper";

import Card from "./card";
import Mask from "./mask";

export default function WrapperPage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  const userID = user?.id;
  const userName = user?.name;

  const endDate = dayjs().utc().endOf("year");
  const startDate = endDate.startOf("year");
  const endDateStr = endDate.toISOString();
  const startDateStr = startDate.toISOString();

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
  }
  if (teamsQuery && Array.isArray(teamsQuery) && teamsQuery.length > 1) {
    const teamsFromIndex1 = teamsQuery.slice(1);
    teamNames = teamsFromIndex1.map((team) => team.name);
    teamNamesString = teamNames.join(", ");
  }

  console.log(data);
  // console.log(cancelledPercentage);
  // console.log(rescheduledPercentage);
  // console.log(acceptedPercentage);
  // console.log("Total Event Length:", bookedHours, "hours", bookedMins, "minutes");
  // console.log("Total Event Length:", totalEventLength);
  console.log("My Teams:", teamNamesString);
  console.log("Most common event Id:", mostCommonEventTypeId);
  console.log("Number of event occurrences:", maxCount);
  console.log("My Teams:", teamNamesString);
  console.log("Most common event Id:", mostCommonEventTypeId);
  console.log("Number of event occurrences:", maxCount);
  const totalMeetingTime = `${bookedHours} ${t("hours")} ${t("and")} ${bookedMins} ${t("minutes")}`;

  return (
    <div className="relative overflow-hidden">
      <ShellMain heading={t("insights")} subtitle={t("insights_subtitle")}>
        <div className="flex w-full flex-col space-y-8 p-2">
          <div className="h-32 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg" />

          <div className="h-[650px] w-full space-y-8 overflow-scroll overscroll-none pt-5">
            <Banner />
            <div className="flex w-full flex-row space-x-5">
              <Card content={t("meetings_booked")} numbers={totalBookings} unit="" themeIdx="1" />
              <Card content={t("time_in_meetings")} numbers={bookedHours} unit={t("hours")} themeIdx="2" />
              {/* <Card content={"People met"} numbers={totalBookings} unit={""} /> */}
            </div>

            <div className="flex w-full flex-row space-x-5">
              <Card content={t("cancelled")} numbers={cancelledPercentage} unit="%" themeIdx="3" />
              <Card content={t("rescheduled")} numbers={rescheduledPercentage} unit="%" themeIdx="4" />
              <Card content={t("accepted")} numbers={acceptedPercentage} unit="%" themeIdx="2" />
              {/* <Card content={"People met"} numbers={totalBookings} unit={""} /> */}
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 1.5 }}>
              <div className="flex h-64 w-full items-center justify-center rounded-xl border-2 bg-gradient-to-r shadow-lg" />
            </motion.div>
            <div className="flex h-64 w-full items-center justify-center rounded-xl border-2 bg-gradient-to-r shadow-lg" />
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
