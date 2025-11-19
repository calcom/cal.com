import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { PageProps } from "app/_types";
import { _generateMetadata, getTranslate } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import BookingLogsView from "~/booking/logs/views/booking-logs-view";

export const generateMetadata = async ({ params }: { params: Promise<{ bookinguid: string }> }) =>
    await _generateMetadata(
        (t) => t("booking_history"),
        (t) => t("booking_history_description"),
        undefined,
        undefined,
        `/booking/logs/${(await params).bookinguid}`
    );

const Page = async ({ params }: PageProps) => {
    const resolvedParams = await params;
    const bookingUid = resolvedParams.bookinguid;

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
            <BookingLogsView bookingUid={bookingUid} />
        </ShellMainAppDir>
    );
};

export default Page;

