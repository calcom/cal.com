/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc";
interface GeneralViewProps {
    currentOrg: RouterOutputs["viewer"]["organizations"]["listCurrent"];
    isAdminOrOwner: boolean;
}
export declare const NoSlotsNotificationSwitch: ({ currentOrg, isAdminOrOwner }: GeneralViewProps) => JSX.Element | null;
export {};
//# sourceMappingURL=NoSlotsNotificationSwitch.d.ts.map