/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { UseBookingFormReturnType } from "../hooks/useBookingForm";
import type { IUseBookingErrors, IUseBookingLoadingStates } from "../hooks/useBookings";
type BookEventFormProps = {
    onCancel?: () => void;
    onSubmit: () => void;
    errorRef: React.RefObject<HTMLDivElement>;
    errors: UseBookingFormReturnType["errors"] & IUseBookingErrors;
    loadingStates: IUseBookingLoadingStates;
    children?: React.ReactNode;
    bookingForm: UseBookingFormReturnType["bookingForm"];
    renderConfirmNotVerifyEmailButtonCond: boolean;
    extraOptions: Record<string, string | string[]>;
    isPlatform?: boolean;
    isVerificationCodeSending: boolean;
};
export declare const BookEventForm: ({ onCancel, eventQuery, rescheduleUid, onSubmit, errorRef, errors, loadingStates, renderConfirmNotVerifyEmailButtonCond, bookingForm, children, extraOptions, isVerificationCodeSending, isPlatform, }: Omit<BookEventFormProps, "event"> & {
    eventQuery: {
        isError: boolean;
        isPending: boolean;
        data?: Pick<BookerEvent, "price" | "currency" | "metadata" | "bookingFields" | "locations"> | null;
    };
    rescheduleUid: string | null;
}) => JSX.Element;
export {};
//# sourceMappingURL=BookEventForm.d.ts.map