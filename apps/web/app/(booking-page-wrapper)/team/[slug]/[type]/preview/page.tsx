import type { PageProps } from "app/_types";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getTeamBookingPreviewProps } from "@server/lib/team/[slug]/[type]/getStaticPreviewProps";

import { TeamBookingPreview } from "./team-booking-preview";

// Enable ISR - 1 hour cache
export const revalidate = 3600;

export const generateMetadata = () => ({
  title: "Team Booking Preview",
  description: "Team Booking Preview",
  robots: {
    follow: false,
    index: false,
  },
});

export default async function TeamBookingPreviewPage({ params, searchParams }: PageProps) {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getTeamBookingPreviewProps(legacyCtx);

  return <TeamBookingPreview {...props} />;
}
