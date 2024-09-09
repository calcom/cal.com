/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
export declare function ScheduleListItem({ schedule, deleteFunction, displayOptions, updateDefault, isDeletable, duplicateFunction, }: {
    schedule: RouterOutputs["viewer"]["availability"]["list"]["schedules"][number];
    deleteFunction: ({ scheduleId }: {
        scheduleId: number;
    }) => void;
    displayOptions?: {
        timeZone?: string;
        hour12?: boolean;
        weekStart?: string;
    };
    isDeletable: boolean;
    updateDefault: ({ scheduleId, isDefault }: {
        scheduleId: number;
        isDefault: boolean;
    }) => void;
    duplicateFunction: ({ scheduleId }: {
        scheduleId: number;
    }) => void;
}): JSX.Element;
//# sourceMappingURL=ScheduleListItem.d.ts.map