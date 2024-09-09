/// <reference types="react" />
import { z } from "zod";
import type { BookerEvent } from "@calcom/features/bookings/types";
export interface IUseBookingForm {
    event?: Pick<BookerEvent, "bookingFields"> | null;
    sessionEmail?: string | null;
    sessionName?: string | null;
    sessionUsername?: string | null;
    hasSession: boolean;
    extraOptions: Record<string, string | string[]>;
    prefillFormParams: {
        guests: string[];
        name: string | null;
    };
}
export type UseBookingFormReturnType = ReturnType<typeof useBookingForm>;
export declare const useBookingForm: ({ event, sessionEmail, sessionName, sessionUsername, hasSession, extraOptions, prefillFormParams, }: IUseBookingForm) => {
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
    key: string;
    formEmail: string;
    formName: (string | {
        firstName: string;
        lastName?: string | undefined;
    }) & (string | {
        firstName: string;
        lastName?: string | undefined;
    } | undefined);
    beforeVerifyEmail: () => void;
    formErrors: {
        hasFormErrors: boolean;
        formErrors: import("react-hook-form").FieldError | undefined;
    };
    errors: {
        hasFormErrors: boolean;
        formErrors: import("react-hook-form").FieldError | undefined;
    };
};
//# sourceMappingURL=useBookingForm.d.ts.map