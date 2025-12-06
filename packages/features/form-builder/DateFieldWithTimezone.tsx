"use client";

import { useContext } from "react";

import type { TextLikeComponentProps } from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import Widgets from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import { BookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useBookerTime } from "@calcom/features/bookings/Booker/components/hooks/useBookerTime";

export function DateFieldWithTimezone(props: TextLikeComponentProps) {

    const bookerStoreContext = useContext(BookerStoreContext);

    let timezone: string | undefined = undefined;
    if (bookerStoreContext) {
        try {
            const bookerTime = useBookerTime();
            timezone = bookerTime?.timezone;
        } catch {
            return undefined;
        }
    }

    return <Widgets.DateWidget noLabel={true} timezone={timezone} {...props} />;
}
