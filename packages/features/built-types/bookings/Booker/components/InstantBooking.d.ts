/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { User } from "@calcom/prisma/client";
interface IInstantBookingProps {
    onConnectNow: () => void;
    event: Pick<BookerEvent, "entity" | "schedulingType"> & {
        users: (Pick<User, "name" | "username" | "avatarUrl"> & {
            bookerUrl: string;
        })[];
    };
}
export declare const InstantBooking: ({ onConnectNow, event }: IInstantBookingProps) => JSX.Element;
export {};
//# sourceMappingURL=InstantBooking.d.ts.map