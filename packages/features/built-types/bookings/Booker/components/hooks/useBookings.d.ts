/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { UseBookingFormReturnType } from "./useBookingForm";
export interface IUseBookings {
    event: {
        data?: (Pick<BookerEvent, "id" | "slug" | "hosts" | "requiresConfirmation" | "isDynamic" | "metadata" | "forwardParamsSuccessRedirect" | "successRedirectUrl" | "length" | "recurringEvent" | "schedulingType"> & {
            users: Pick<BookerEvent["users"][number], "name" | "username" | "avatarUrl" | "weekStart" | "profile" | "bookerUrl">[];
        }) | null;
    };
    hashedLink?: string | null;
    bookingForm: UseBookingFormReturnType["bookingForm"];
    metadata: Record<string, string>;
    teamMemberEmail?: string | null;
}
export interface IUseBookingLoadingStates {
    creatingBooking: boolean;
    creatingRecurringBooking: boolean;
    creatingInstantBooking: boolean;
}
export interface IUseBookingErrors {
    hasDataErrors: boolean;
    dataErrors: unknown;
}
export type UseBookingsReturnType = ReturnType<typeof useBookings>;
export declare const useBookings: ({ event, hashedLink, bookingForm, metadata, teamMemberEmail }: IUseBookings) => {
    handleBookEvent: () => void;
    expiryTime: Date | undefined;
    bookingForm: import("react-hook-form").UseFormReturn<{
        locationType?: string | undefined;
        responses: ((({
            name: (string | {
                firstName: string;
                lastName?: string | undefined;
            }) & (string | {
                firstName: string;
                lastName?: string | undefined;
            } | undefined);
            email: string;
            guests?: string[] | undefined;
            notes?: string | undefined;
            location?: {
                value: string;
                optionValue: string;
            } | undefined;
            smsReminderNumber?: string | undefined;
            rescheduleReason?: string | undefined;
        } & Record<string, any>) | {}) & (({
            name: (string | {
                firstName: string;
                lastName?: string | undefined;
            }) & (string | {
                firstName: string;
                lastName?: string | undefined;
            } | undefined);
            email: string;
            guests?: string[] | undefined;
            notes?: string | undefined;
            location?: {
                value: string;
                optionValue: string;
            } | undefined;
            smsReminderNumber?: string | undefined;
            rescheduleReason?: string | undefined;
        } & Record<string, any>) | {} | undefined)) | null;
        globalError: undefined;
    }, any>;
    bookerFormErrorRef: import("react").RefObject<HTMLDivElement>;
    errors: {
        hasDataErrors: boolean;
        dataErrors: Error | null;
    };
    loadingStates: {
        creatingBooking: boolean;
        creatingRecurringBooking: boolean;
        creatingInstantBooking: boolean;
    };
    instantVideoMeetingUrl: string | undefined;
};
//# sourceMappingURL=useBookings.d.ts.map