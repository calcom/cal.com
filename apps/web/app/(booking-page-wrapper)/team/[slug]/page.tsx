import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getCalIdServerSideProps } from "@lib/team/[slug]/getCalIdServerSideProps";

import type { PageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const { team, isSEOIndexable, currentOrgDomain } = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  const meeting = {
    title: team.bio ?? "",
    profile: {
      name: `${team.name}`,
      image: getDefaultAvatar(team.logoUrl, team.name),
    },
  };
  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => team.name || t("nameless_team"),
    (t) => team.name || t("nameless_team"),
    false,
    getOrgFullOrigin(currentOrgDomain ?? null),
    `/team/${decodedParams.slug}`
  );
  return {
    ...metadata,
    robots: {
      follow: isSEOIndexable,
      index: isSEOIndexable,
    },
  };
};

const getData = withAppDirSsr<PageProps>(getCalIdServerSideProps);

const ServerPage = async ({ params, searchParams }: _PageProps) => {
  const resolvedParams = await params;

  // Check if this should be handled by the [type] route
  // If there's a type parameter in the URL, redirect to the correct route
  if (resolvedParams.type) {
    // This should not happen in Next.js App Router, but let's log it
    return <div>This should be handled by team/[slug]/[type] route</div>;
  }

  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  return <LegacyPage {...props} />;
};
export default ServerPage;
