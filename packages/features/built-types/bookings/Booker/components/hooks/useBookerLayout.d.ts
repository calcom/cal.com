/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { BookerLayouts } from "@calcom/prisma/zod-utils";
import type { BookerLayout } from "../../types";
export type UseBookerLayoutType = ReturnType<typeof useBookerLayout>;
export declare const useBookerLayout: (event: Pick<BookerEvent, "profile"> | undefined | null) => {
    shouldShowFormInDialog: boolean;
    hasDarkBackground: boolean | undefined;
    extraDays: number;
    columnViewExtraDays: import("react").MutableRefObject<number>;
    isMobile: boolean;
    isEmbed: boolean | undefined;
    isTablet: boolean;
    layout: BookerLayout;
    defaultLayout: BookerLayouts;
    hideEventTypeDetails: boolean | undefined;
    bookerLayouts: {
        enabledLayouts: BookerLayouts[];
        defaultLayout: BookerLayouts;
    };
};
//# sourceMappingURL=useBookerLayout.d.ts.map