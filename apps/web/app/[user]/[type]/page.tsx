import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateEventBookingPageMetadata } from "app/generateBookingPageMetadata";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);

  const { booking, user: username, slug: eventSlug, isSEOIndexable, eventData, isBrandingHidden } = props;
  const rescheduleUid = booking?.uid;
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(legacyCtx.req, legacyCtx.params?.orgSlug);

  const event = await EventRepository.getPublicEvent({
    username,
    eventSlug,
    isTeamEvent: false,
    org: isValidOrgDomain ? currentOrgDomain : null,
    fromRedirectOfNonOrgLink: legacyCtx.query.orgRedirection === "true",
  });

  const profileName = event?.profile?.name ?? "";
  const profileImage = event?.profile.image;
  const title = event?.title ?? "";
  const metadata = await generateEventBookingPageMetadata({
    event: {
      hidden: event?.hidden ?? false,
      title,
      users: event?.users ?? [],
    },
    hideBranding: isBrandingHidden,
    orgSlug: eventData?.entity.orgSlug ?? null,
    isSEOIndexable: !!isSEOIndexable,
    profile: { name: profileName, image: profileImage ?? "" },
    isReschedule: !!rescheduleUid,
  });
  return metadata;
};
const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);

export default WithLayout({
  getData,
  Page: LegacyPage,
  getLayout: null,
})<"P">;
