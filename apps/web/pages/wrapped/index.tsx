import { motion } from "framer-motion";

import dayjs from "@calcom/dayjs";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import Card from "./card";
import Mask from "./mask";

export default function InsightsPage() {
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

  let totalBookings;
  let cancelledPercentage;
  let rescheduledPercentage;
  let acceptedPercentage;
  let bookedHours;
  let bookedMins;
  let totalEventLength;

  let firstTime: any = "0";
  if (data != undefined && data.length > 0) {
    firstTime = data[0].startTime.toISOString();

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
        const eventLength = item.eventLength || 0;
        return eventLength;
      })
      .reduce((acc, length) => acc + length, 0); // Use reduce to calculate the total event length
    bookedHours = Math.floor(totalEventLength / 60);
    bookedMins = totalEventLength % 60;
  }

  console.log(cancelledPercentage);
  console.log(rescheduledPercentage);
  console.log(acceptedPercentage);
  console.log("Total Event Length:", bookedHours, "hours", bookedMins, "minutes");
  console.log("Total Event Length:", totalEventLength);

  return (
    <div className="relative overflow-hidden">
      <ShellMain heading="Insights" subtitle={t("insights_subtitle")}>
        <div className="flex w-full flex-col space-y-8 p-2">
          <div className="h-32 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-lg" />

          <div className="h-[650px] w-full space-y-8 overflow-scroll overscroll-none pt-5">
            <div className="h-64 w-full rounded-xl border-2 shadow-lg" />
            <div className="flex w-full flex-row space-x-5">
              <Card />
              <Card />
              <Card />
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
