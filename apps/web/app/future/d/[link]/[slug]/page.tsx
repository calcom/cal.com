import LegacyPage from "@pages/d/[link]/[slug]";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Params, SearchParams } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/d/[link]/[slug]/getServerSideProps";

export const generateMetadata = async ({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) => {
  const pageProps = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  const { entity, booking, user: username, slug: eventSlug, isTeamEvent } = pageProps;
  const rescheduleUid = booking?.uid;

  const event = await EventRepository.getPublicEvent({
    username,
    eventSlug,
    isTeamEvent,
    org: entity.orgSlug ?? null,
    fromRedirectOfNonOrgLink: entity.fromRedirectOfNonOrgLink,
  });

  const profileName = event?.profile?.name ?? "";
  const title = event?.title ?? "";
  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`
  );
};

const getData = withAppDirSsr(getServerSideProps);
export default WithLayout({ getLayout: null, Page: LegacyPage, getData })<"P">;
