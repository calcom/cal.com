/// <reference types="react" />
import { type RouterOutputs } from "@calcom/trpc";
export type CalendarCredentialBannerProps = {
    data: RouterOutputs["viewer"]["getUserTopBanners"]["calendarCredentialBanner"];
};
declare function CalendarCredentialBanner({ data }: CalendarCredentialBannerProps): JSX.Element | null;
export default CalendarCredentialBanner;
//# sourceMappingURL=CalendarCredentialBanner.d.ts.map