/// <reference types="react" />
import type { IconName } from "@calcom/ui";
type DisplayInfoType = {
    label: string;
    icon?: IconName;
    value: string | string[];
    coloredBadges?: boolean;
};
export declare function DisplayInfo({ label, icon, value, coloredBadges }: DisplayInfoType): JSX.Element;
export {};
//# sourceMappingURL=DisplayInfo.d.ts.map