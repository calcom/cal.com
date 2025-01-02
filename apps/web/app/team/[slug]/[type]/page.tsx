import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateEventBookingPageMetadata } from "app/generateBookingPageMetadata";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import LegacyPage, { type PageProps as LegacyPageProps } from "~/team/type-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);
  const { user: username, slug: eventSlug, booking, isSEOIndexable, eventData, isBrandingHidden } = props;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, legacyCtx.params?.orgSlug);

  const event = await EventRepository.getPublicEvent({
    username,
    eventSlug,
    isTeamEvent: true,
    org: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: legacyCtx.query.orgRedirection === "true",
  });

  return await generateEventBookingPageMetadata({
    profile: {
      name: event?.profile?.name ?? "",
      image: event?.profile.image ?? "",
    },
    event: {
      title: event?.title ?? "",
      hidden: event?.hidden ?? false,
      users: [
        ...(event?.users || []).map((user) => ({
          name: `${user.name}`,
          username: `${user.username}`,
        })),
      ],
    },
    hideBranding: isBrandingHidden,
    orgSlug: eventData?.entity.orgSlug ?? null,
    isSEOIndexable,
    isReschedule: !!booking,
  });
};
const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);

export default WithLayout({
  Page: LegacyPage,
  getData,
  getLayout: null,
  isBookingPage: true,
})<"P">;
