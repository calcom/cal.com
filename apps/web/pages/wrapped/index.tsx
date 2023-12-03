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

  console.log(data);

  let firstTime: any = "0";
  if (data != undefined && data.length > 0) {
    firstTime = data[0].startTime.toISOString();
  }

  // Check for number of user bookings
  // Check if data exists and if data[0] is an array
  if (data && Array.isArray(data)) {
    // Use map to iterate through each item in data[0]
    const totalEventLength = data
      .map((item) => {
        // Access the eventLength property of each item
        const eventLength = item.eventLength || 0;
        return eventLength;
      })
      .reduce((acc, length) => acc + length, 0); // Use reduce to calculate the total event length
    const hours = Math.floor(totalEventLength / 60);
    const minutes = totalEventLength % 60;
    console.log("Total Event Length:", hours, "hours", minutes, "minutes");
    console.log("Total Event Length:", totalEventLength);

    const userEmails = data.map((item) => item.userEmail);
    // Use a Set to get unique userEmails and then get the size of the Set
    // const uniqueUserEmailCount = new Set(userEmails).size;
    //console.log("Unique User Email Count:", uniqueUserEmailCount);
  }

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
