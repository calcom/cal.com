import TypePage, { type PageProps } from "@pages/team/[slug]/[type]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Params, SearchParams } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { type GetServerSidePropsContext } from "next";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx as unknown as GetServerSidePropsContext);
  const { eventData, user, slug, booking } = props;
  const entity = eventData.entity;
  const { trpc } = await import("@calcom/trpc");
  const { data: event } = trpc.viewer.public.event.useQuery(
    {
      username: user,
      eventSlug: slug,
      isTeamEvent: false,
      org: entity.orgSlug ?? null,
      fromRedirectOfNonOrgLink: entity.fromRedirectOfNonOrgLink,
    },
    { refetchOnWindowFocus: false }
  );

  const profileName = event?.profile?.name ?? "";
  const title = event?.title ?? "";

  return await _generateMetadata(
    (t) => `${booking?.uid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${booking?.uid ? t("reschedule") : ""} ${title}`
  );
};
const getData = withAppDirSsr<PageProps>(getServerSideProps);

export default WithLayout({
  Page: TypePage,
  getData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
