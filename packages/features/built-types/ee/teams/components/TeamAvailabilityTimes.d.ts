import React from "react";
import type { ITimezone } from "react-timezone-select";
import type { Dayjs } from "@calcom/dayjs";
interface Props {
    teamId: number;
    memberId: number;
    selectedDate: Dayjs;
    selectedTimeZone: ITimezone;
    frequency: number;
    HeaderComponent?: React.ReactNode;
    className?: string;
}
export default function TeamAvailabilityTimes(props: Props): JSX.Element;
export {};
//# sourceMappingURL=TeamAvailabilityTimes.d.ts.map