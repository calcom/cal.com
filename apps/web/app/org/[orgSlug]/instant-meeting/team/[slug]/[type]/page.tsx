import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { orgDomainConfig } from "@calcom/features/ee/organizations/lib/orgDomains";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@lib/org/[orgSlug]/instant-meeting/team/[slug]/[type]/getServerSideProps";

import type { PageProps } from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";
import Page from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const context = buildLegacyCtx(headers(), cookies(), params, searchParams);
  const { isBrandingHidden, eventData } = await getData(context);
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);

  const org = isValidOrgDomain ? currentOrgDomain : null;

  const profileName = eventData?.profile.name ?? "";
  const title = eventData?.title ?? "";

  return await _generateMetadata(
    () => `${title} | ${profileName}`,
    () => `${title}`,
    isBrandingHidden
  );
};

const getData = withAppDirSsr<PageProps>(getServerSideProps);
export default WithLayout({ getData, Page, isBookingPage: true })<"P">;
