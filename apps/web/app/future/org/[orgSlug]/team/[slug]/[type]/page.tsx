import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import type { PageProps } from "~/team/type-view";
import TypePage from "~/team/type-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);
  const { user: username, slug: eventSlug, booking } = props;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, legacyCtx.params?.orgSlug);

  const event = await EventRepository.getPublicEvent({
    username,
    eventSlug,
    isTeamEvent: true,
    org: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: legacyCtx.query.orgRedirection === "true",
  });

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
