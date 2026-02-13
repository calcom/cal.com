import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { shallow } from "zustand/shallow";

export const useBookerTimezone = () => {
    const [storeTimezone] = useBookerStoreContext((state) => [state.timezone], shallow);
    const { timezone: bookerUserPreferredTimezone } = useTimePreferences();

    // BookerStore timezone is the one that is updated no matter what could be the reason of the update
    // e.g. timezone configured through cal.tz query param is available there but not in the preferences as those are booker user's preferences
    return storeTimezone ?? bookerUserPreferredTimezone;
};
