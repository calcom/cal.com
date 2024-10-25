import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";
import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/instant-meeting/team/[slug]/[type]/getServerSideProps";

import type { PageProps } from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";
import Page from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";

export const generateMetadata = async (props: _PageProps) => {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const context = buildLegacyCtx(await headers(), await cookies(), params, searchParams);
  const { slug: eventSlug, user: username } = await getData(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);

  const org = isValidOrgDomain ? currentOrgDomain : null;

  const event = await EventRepository.getPublicEvent({
    username,
    eventSlug,
    isTeamEvent: true,
    org,
    fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
  });

  const profileName = event?.profile.name ?? "";
  const title = event?.title ?? "";

  return await _generateMetadata(
    () => `${title} | ${profileName}`,
    () => `${title}`
  );
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);
export default WithLayout({ getLayout, getData, Page })<"P">;
