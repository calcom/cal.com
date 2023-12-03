import dayjs from "@calcom/dayjs";
import { getLayout } from "@calcom/features/MainLayout";
import { getFeatureFlagMap } from "@calcom/features/flags/server/utils";
import { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";

import PageWrapper from "@components/PageWrapper";

export default function WrapperPage() {
  const { t } = useLocale();
  const { data: user } = trpc.viewer.me.useQuery();

  const userID = user?.id;
  const userName = user?.name;

  const endDate = dayjs().utc().endOf("year");
  const startDate = endDate.startOf("year");
  const endDateStr = endDate.toISOString();
  const startDateStr = startDate.toISOString();
  let bookedHours;
  let bookedMins;
  let totalEventLength;

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

  let total;
  let cancelledPercentage;
  let rescheduledPercentage;
  let acceptedPercentage;

  let firstTime: any = "0";
  if (data != undefined && data.length > 0) {
    firstTime = data[0].startTime.toISOString();

    // cancelled = status cancelled - timestatus rescheduled
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

    total = cancelledCount + acceptedCount;
    cancelledPercentage = (cancelledCount / total) * 100;
    rescheduledPercentage = (rescheduledCount / total) * 100;
    acceptedPercentage = (acceptedCount / total) * 100;

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
    <div>
      <ShellMain heading="Insights" subtitle={t("insights_subtitle")}>
        <h1>Hi</h1>
        <h1>{firstTime}</h1>
      </ShellMain>
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
