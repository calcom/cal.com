import { withAppDirSsr } from "app/WithAppDirSsr";
import withEmbedSsrAppDir from "app/WithEmbedSSR";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import type { PageProps } from "~/team/type-view";
import LegacyPage from "~/team/type-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);
  const { eventData, user: username, slug: eventSlug, booking } = props;
  const entity = eventData.entity;

  const event = await EventRepository.getPublicEvent({
    username,
    eventSlug,
    isTeamEvent: false,
    org: entity.orgSlug ?? null,
    fromRedirectOfNonOrgLink: entity.fromRedirectOfNonOrgLink,
  });

  const profileName = event?.profile?.name ?? "";
  const title = event?.title ?? "";

  return await _generateMetadata(
    (t) => `${booking?.uid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${booking?.uid ? t("reschedule") : ""} ${title}`
  );
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);
const getEmbedData = withEmbedSsrAppDir(getData);

export default WithLayout({ getLayout: null, getData: getEmbedData, Page: LegacyPage })<"P">;
