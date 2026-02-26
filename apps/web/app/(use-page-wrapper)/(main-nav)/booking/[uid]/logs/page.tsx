// Added as a separate route for now to ease the testing of the audit logs feature
// It partially matches the figma design - https://www.figma.com/design/wleA2SR6rn60EK7ORxAfMy/Cal.com-New-Features?node-id=5641-6732&p=f
// TOOD: Move it to the booking page side bar later
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import { BookingHistoryPage } from "@calcom/web/modules/booking-audit/components/BookingHistoryPage";

export const generateMetadata = async ({ params }: { params: Promise<{ uid: string }> }) =>
  await _generateMetadata(
    (t) => t("booking_history"),
    (t) => t("booking_history_description"),
    undefined,
    undefined,
    `/booking/${(await params).uid}/logs`
  );

const Page = async ({ params }: PageProps) => {
  const resolvedParams = await params;
  const bookingUid = resolvedParams.uid;

  if (!bookingUid || typeof bookingUid !== "string") {
    redirect("/bookings/upcoming");
  }

  const t = await getTranslate();
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return (
    <ShellMainAppDir heading={t("booking_history")} subtitle={t("booking_history_description")}>
      <BookingHistoryPage bookingUid={bookingUid} />
    </ShellMainAppDir>
  );
};

export default Page;
