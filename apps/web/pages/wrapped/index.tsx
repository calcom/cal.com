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

  const endDate = dayjs();
  const startDate = endDate.startOf("year");
  const endDateStr = endDate.toISOString();
  const startDateStr = startDate.toISOString();
  const startDateTarget = dayjs.utc("20000101000000", "YYYYMMDD[T]HHmmss[Z]").toISOString();
  const endDateTarget = dayjs.utc("30000101000000", "YYYYMMDD[T]HHmmss[Z]").toISOString();

  console.log(startDateStr);
  console.log(startDateTarget);

  const { data, isSuccess, isLoading } = trpc.viewer.insights.AllBookingsForMember.useQuery(
    {
      startDate: startDateTarget,
      endDate: endDateTarget,
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
