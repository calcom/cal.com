/// <reference types="react" />
import type { GroupBase, Props, SingleValue } from "react-select";
import type { EventLocationType } from "@calcom/app-store/locations";
export type LocationOption = {
    label: string;
    value: EventLocationType["type"];
    icon?: string;
    disabled?: boolean;
    address?: string;
    credentialId?: number;
    teamName?: string;
};
export type SingleValueLocationOption = SingleValue<LocationOption>;
export type GroupOptionType = GroupBase<LocationOption>;
export default function LocationSelect(props: Props<LocationOption, false, GroupOptionType>): JSX.Element;
//# sourceMappingURL=LocationSelect.d.ts.map