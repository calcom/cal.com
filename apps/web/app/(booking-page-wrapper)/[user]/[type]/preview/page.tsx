import type { PageProps } from "app/_types";
import { headers, cookies } from "next/headers";

import { buildLegacyCtx } from "@lib/buildLegacyCtx";

import { getBookingPreviewProps } from "@server/lib/[user]/[type]/getStaticPreviewProps";

import { UserBookingPreview } from "./user-booking-preview";

// Enable ISR - 1 hour cache
export const revalidate = 3600;

export const generateMetadata = () => ({
  title: "User Booking Preview",
  description: "User Booking Preview",
  robots: {
    follow: false,
    index: false,
  },
});

export default async function UserBookingPreviewPage({ params, searchParams }: PageProps) {
  const legacyCtx = buildLegacyCtx(await headers(), await cookies(), await params, await searchParams);
  const props = await getBookingPreviewProps(legacyCtx);

  return <UserBookingPreview {...props} />;
}
