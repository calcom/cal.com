import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import LegacyPage from "~/users/views/users-type-public-view";
import {
  getServerSideProps,
  type PageProps as LegacyPageProps,
} from "~/users/views/users-type-public-view.getServerSideProps";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  const { eventData, booking, user, slug } = props;
  const rescheduleUid = booking?.uid;
  const { trpc } = await import("@calcom/trpc");
  const { data: event } = trpc.viewer.public.event.useQuery(
    {
      username: user,
      eventSlug: slug,
      isTeamEvent: false,
      org: eventData.entity.orgSlug ?? null,
      fromRedirectOfNonOrgLink: eventData.entity.fromRedirectOfNonOrgLink,
    },
    { refetchOnWindowFocus: false }
  );

  const profileName = event?.profile?.name ?? "";
  const title = event?.title ?? "";

  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`
  );
};
const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);

export default WithLayout({
  getData,
  Page: LegacyPage,
  getLayout: null,
})<"P">;
