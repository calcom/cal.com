/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
import type { SliderUser } from "./AvailabilitySliderTable";
interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedUser?: SliderUser | null;
}
export declare function AvailabilityEditSheet(props: Props): JSX.Element | null;
type Data = RouterOutputs["viewer"]["availability"]["schedule"]["getScheduleByUserId"];
export declare function AvailabilityEditSheetForm(props: Props & {
    data: Data;
    isPending: boolean;
}): JSX.Element;
export {};
//# sourceMappingURL=AvailabilityEditSheet.d.ts.map