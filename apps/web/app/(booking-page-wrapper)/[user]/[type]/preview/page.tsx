import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { headers, cookies } from "next/headers";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";

import { getBookingPreviewProps } from "@server/lib/[user]/[type]/getStaticPreviewProps";

import { UserBookingPreview } from "./user-booking-preview";

export const generateMetadata = async ({ params, searchParams }: PageProps) => {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getBookingPreviewProps(legacyCtx);

  const { eventType, profile, entity } = props;

  const decodedParams = decodeParams(await params);
  const metadata = await _generateMetadata(
    () => `${eventType.title} | ${profile.name}`,
    () => eventType.title,
    false,
    getOrgFullOrigin(entity.orgSlug ?? null),
    `/${decodedParams.user}/${decodedParams.type}/preview`
  );

  return {
    ...metadata,
    robots: {
      follow: false,
      index: false,
    },
  };
};

export default async function UserBookingPreviewPage({ params, searchParams }: PageProps) {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getBookingPreviewProps(legacyCtx);

  return <UserBookingPreview {...props} />;
}
