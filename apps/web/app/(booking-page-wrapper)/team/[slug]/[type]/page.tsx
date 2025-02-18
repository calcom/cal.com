import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/team/[slug]/[type]/getServerSideProps";

import LegacyPage from "~/team/type-view";
import type { PageProps as LegacyPageProps } from "~/team/type-view";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const props = await getData(legacyCtx);
  const { booking, isSEOIndexable, eventData, isBrandingHidden } = props;

  const profileName = eventData?.profile?.name ?? "";
  const profileImage = eventData?.profile.image;
  const title = eventData?.title ?? "";
  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    users: [
      ...(eventData?.users || []).map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })),
    ],
  };

  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => `${booking?.uid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${booking?.uid ? t("reschedule") : ""} ${title}`,
    isBrandingHidden,
    getOrgFullOrigin(eventData.entity.orgSlug ?? null)
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData?.hidden || !isSEOIndexable),
      index: !(eventData?.hidden || !isSEOIndexable),
    },
  };
};

const getData = withAppDirSsr<LegacyPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: PageProps) => {
  const props = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));
  return <LegacyPage {...props} />;
};
export default ServerPage;
