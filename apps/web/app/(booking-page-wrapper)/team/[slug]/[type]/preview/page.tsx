import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";

import { getTeamBookingPreviewProps } from "@server/lib/team/[slug]/[type]/getStaticPreviewProps";

import { TeamBookingPreview } from "./team-booking-preview";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getTeamBookingPreviewProps(legacyCtx);
  const { eventType, team, entity } = props;
  const decodedParams = decodeParams(await params);
  const metadata = await _generateMetadata(
    () => `${eventType.title} | ${team.name}`,
    () => eventType.title,
    false,
    getOrgFullOrigin(entity.orgSlug ?? null),
    `/team/${decodedParams.slug}/${decodedParams.type}/preview`
  );

  return {
    ...metadata,
    robots: {
      follow: false,
      index: false,
    },
  };
};

export default async function TeamBookingPreviewPage({ params, searchParams }: PageProps) {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getTeamBookingPreviewProps(legacyCtx);

  return <TeamBookingPreview {...props} />;
}
