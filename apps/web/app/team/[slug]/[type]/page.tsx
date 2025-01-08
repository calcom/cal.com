import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateEventBookingPageMetadata } from "app/generateBookingPageMetadata";
import { WithLayout } from "app/layoutHOC";
import { cookies, headers } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import LegacyPage, { type PageProps as LegacyPageProps } from "~/team/type-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);
  const { booking, isSEOIndexable, eventData, isBrandingHidden } = props;

  return await generateEventBookingPageMetadata({
    profile: {
      name: eventData?.profile?.name ?? "",
      image: eventData?.profile.image ?? "",
    },
    event: {
      title: eventData?.title ?? "",
      hidden: eventData?.hidden ?? false,
      users: [
        ...(eventData?.users || []).map((user) => ({
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
