import { withAppDirSsr } from "app/WithAppDirSsr";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { WithLayout } from "app/layoutHOC";
import { headers, cookies } from "next/headers";

import { getLayout } from "@calcom/features/MainLayoutAppDir";
import { EventRepository } from "@calcom/lib/server/repository/event";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getServerSideProps } from "@server/lib/org/[orgSlug]/instant-meeting/team/[slug]/[type]/getServerSideProps";

import type { PageProps } from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";
import Page from "~/org/[orgSlug]/instant-meeting/team/[slug]/[type]/instant-meeting-view";

export const generateMetadata = async ({ params, searchParams }: _PageProps) => {
  const {
    slug: eventSlug,
    user: username,
    entity,
  } = await getData(buildLegacyCtx(headers(), cookies(), params, searchParams));

  const event = await EventRepository.getPublicEvent({
    username,
    eventSlug,
    isTeamEvent: true,
    org: entity.orgSlug ?? null,
    fromRedirectOfNonOrgLink: entity.fromRedirectOfNonOrgLink,
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
