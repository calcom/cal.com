/// <reference types="react" />
import { BookerLayouts } from "@calcom/prisma/zod-utils";
export declare function Header({ extraDays, isMobile, enabledLayouts, nextSlots, eventSlug, isMyLink, renderOverlay, }: {
    extraDays: number;
    isMobile: boolean;
    enabledLayouts: BookerLayouts[];
    nextSlots: number;
    eventSlug: string;
    isMyLink: boolean;
    renderOverlay?: () => JSX.Element | null;
}): JSX.Element | null;
//# sourceMappingURL=Header.d.ts.map