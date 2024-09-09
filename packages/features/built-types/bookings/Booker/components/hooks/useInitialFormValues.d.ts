import type { BookerEvent } from "@calcom/features/bookings/types";
export type useInitialFormValuesReturnType = ReturnType<typeof useInitialFormValues>;
type UseInitialFormValuesProps = {
    eventType?: Pick<BookerEvent, "bookingFields"> | null;
    rescheduleUid: string | null;
    isRescheduling: boolean;
    email?: string | null;
    name?: string | null;
    username?: string | null;
    hasSession: boolean;
    extraOptions: Record<string, string | string[]>;
    prefillFormParams: {
        guests: string[];
        name: string | null;
    };
};
export declare function useInitialFormValues({ eventType, rescheduleUid, isRescheduling, email, name, username, hasSession, extraOptions, prefillFormParams, }: UseInitialFormValuesProps): {
    initialValues: {
        responses?: Partial<{
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
        } & Record<string, any>> | undefined;
        bookingId?: number | undefined;
    };
    key: string;
};
export {};
//# sourceMappingURL=useInitialFormValues.d.ts.map