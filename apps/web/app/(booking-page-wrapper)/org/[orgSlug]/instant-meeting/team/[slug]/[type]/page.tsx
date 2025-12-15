import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/instant-meeting/team/[slug]/[type]/getServerSideProps";

import type { Props } from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";
import Page from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const context = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const { isBrandingHidden, eventData, teamIsPrivate } = await getData(context);

  const profileName = eventData?.profile.name ?? "";
  const profileImage = eventData?.profile.image;
  const title = eventData?.title ?? "";

  const meeting = {
    title,
    profile: { name: profileName, image: profileImage },
    // Hide team member names in preview if team is private
    users: teamIsPrivate
      ? []
      : [
          ...(eventData?.users || []).map((user) => ({
            name: `${user.name}`,
            username: `${user.username}`,
          })),
        ],
  };
  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    () => `${title} | ${profileName}`,
    () => `${title}`,
    isBrandingHidden,
    getOrgFullOrigin(eventData?.entity.orgSlug ?? null),
    `/instant-meeting/team/${decodedParams.slug}/${decodedParams.type}`
  );

  return {
    ...metadata,
    robots: {
      follow: !eventData?.hidden,
      index: !eventData?.hidden,
    },
  };
};

const getData = withAppDirSsr<Props>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  return <Page {...props} />;
};

export default ServerPage;
