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

  const { booking, isSEOIndexable, eventData, isBrandingHidden } = props;
  const rescheduleUid = booking?.uid;

  const profileName = eventData?.profile?.name ?? "";
  const profileImage = eventData?.profile.image;
  const title = eventData?.title ?? "";
  const metadata = await generateEventBookingPageMetadata({
    event: {
      hidden: eventData?.hidden ?? false,
      title,
      users: eventData?.users ?? [],
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
