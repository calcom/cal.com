"use client";

import { useContext, useMemo } from "react";

import type { TextLikeComponentProps } from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import Widgets from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import { BookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { getBookerTimezone } from "@calcom/features/bookings/Booker/utils/getBookerTimezone";


function useSafeBookerTime() {
    const bookerStoreContext = useContext(BookerStoreContext);
    const { timezone: timezoneFromTimePreferences } = useTimePreferences();

    const timezoneFromBookerStore = useMemo(() => {
        if (!bookerStoreContext) {
            return null;
        }

        return bookerStoreContext.getState().timezone;
    }, [bookerStoreContext]);

    const timezone = useMemo(() => {
        return getBookerTimezone({
            storeTimezone: timezoneFromBookerStore,
            bookerUserPreferredTimezone: timezoneFromTimePreferences,
        });
    }, [timezoneFromBookerStore, timezoneFromTimePreferences]);

    return { timezone };
}

export function DateFieldWithTimezone(props: TextLikeComponentProps) {

    const { timezone } = useSafeBookerTime();

    return <Widgets.DateWidget noLabel={true} timezone={timezone} {...props} />;
}
