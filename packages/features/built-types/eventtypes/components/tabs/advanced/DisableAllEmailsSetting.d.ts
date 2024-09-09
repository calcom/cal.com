/// <reference types="react" />
import type { TFunction } from "next-i18next";
interface DisableEmailsSettingProps {
    checked: boolean;
    onCheckedChange: (e: boolean) => void;
    recipient: "attendees" | "hosts";
    t: TFunction;
}
export declare const DisableAllEmailsSetting: ({ checked, onCheckedChange, recipient, t, }: DisableEmailsSettingProps) => JSX.Element;
export {};
//# sourceMappingURL=DisableAllEmailsSetting.d.ts.map