/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { BaseEmailHtml } from "../components";
export declare const DisabledAppEmail: (props: {
    appName: string;
    appType: string[];
    t: TFunction;
    title?: string | undefined;
    eventTypeId?: number | undefined;
} & Partial<{
    children: import("react").ReactNode;
    callToAction?: import("react").ReactNode;
    subject: string;
    title?: string | undefined;
    subtitle?: import("react").ReactNode;
    headerType?: import("../components/EmailSchedulingBodyHeader").BodyHeadType | undefined;
    hideLogo?: boolean | undefined;
}>) => JSX.Element;
//# sourceMappingURL=DisabledAppEmail.d.ts.map