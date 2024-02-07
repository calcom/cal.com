import type { EventResult } from "@calcom/types/EventManager";
import type {
    AdditionalInformation,
    AppsStatus,
} from "@calcom/types/Calendar";
import { getBookingData } from "../booking/getBookingData";
import { Prisma } from "@calcom/prisma/client";
import { createBooking } from "@calcom/features/bookings/lib";
import { getOriginalRescheduledBooking } from "../booking/getOriginalRescheduledBooking";


export type Booking = Prisma.PromiseReturnType<typeof createBooking>;
export type ReqAppsStatus = AwaitedBookingData["appsStatus"];
type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;
type AwaitedBookingData = Awaited<ReturnType<typeof getBookingData>>;

export function handleAppsStatus(
    results: EventResult<AdditionalInformation>[],
    booking: (Booking & { appsStatus?: AppsStatus[] }) | null,
    reqAppsStatus: ReqAppsStatus
) {
    // Taking care of apps status
    const resultStatus: AppsStatus[] = results.map((app) => ({
        appName: app.appName,
        type: app.type,
        success: app.success ? 1 : 0,
        failures: !app.success ? 1 : 0,
        errors: app.calError ? [app.calError] : [],
        warnings: app.calWarnings,
    }));

    if (reqAppsStatus === undefined) {
        if (booking !== null) {
            booking.appsStatus = resultStatus;
        }
        return resultStatus;
    }
    // From down here we can assume reqAppsStatus is not undefined anymore
    // Other status exist, so this is the last booking of a series,
    // proceeding to prepare the info for the event
    const calcAppsStatus = reqAppsStatus.concat(resultStatus).reduce((prev, curr) => {
        if (prev[curr.type]) {
            prev[curr.type].success += curr.success;
            prev[curr.type].errors = prev[curr.type].errors.concat(curr.errors);
            prev[curr.type].warnings = prev[curr.type].warnings?.concat(curr.warnings || []);
        } else {
            prev[curr.type] = curr;
        }
        return prev;
    }, {} as { [key: string]: AppsStatus });
    return Object.values(calcAppsStatus);
}