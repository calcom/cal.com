import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { getOrgFullOrigin, orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { constructMeetingImage } from "@calcom/lib/OgImages";
import { SEO_IMG_OGIMG } from "@calcom/lib/constants";
import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";

import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);

  const { booking, user: username, slug: eventSlug, isSEOIndexable, eventData } = props;
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

  const metadata = await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`,
    false,
    getOrgFullOrigin(eventData?.entity.orgSlug ?? null)
  );
  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users: [
      ...(event?.users || []).map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })),
    ],
  };
  const image = SEO_IMG_OGIMG + constructMeetingImage(meeting);
  return {
    ...metadata,
    nofollow: event?.hidden || !isSEOIndexable,
    noindex: event?.hidden || !isSEOIndexable,
    openGraph: {
      ...metadata.openGraph,
      images: [image],
    },
  };
};
const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);

export default WithLayout({
  getData,
  Page: LegacyPage,
  getLayout: null,
})<"P">;
