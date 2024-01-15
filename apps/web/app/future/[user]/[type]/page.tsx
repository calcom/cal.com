import LegacyPage, { getServerSideProps, type PageProps } from "@pages/[user]/[type]";
import { withAppDir } from "app/AppDirSSRHOC";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

export const generateMetadata = async ({ params }: { params: Record<string, string | string[]> }) => {
  const props = await getData(
    buildLegacyCtx(headers(), cookies(), params) as unknown as GetServerSidePropsContext
  );

  const { eventData, booking, user, slug } = props;
  const rescheduleUid = booking?.uid;
  const { trpc } = await import("@calcom/trpc/react");
  const { data: event } = trpc.viewer.public.event.useQuery(
    { username: user, eventSlug: slug, isTeamEvent: false, org: eventData.entity.orgSlug ?? null },
    { refetchOnWindowFocus: false }
  );

  const profileName = event?.profile?.name ?? "";
  const title = event?.title ?? "";

  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`
  );
};
export const getData = withAppDir<PageProps>(getServerSideProps);

export default WithLayout({
  getData,
  Page: LegacyPage,
  getLayout: null,
})<"P">;
