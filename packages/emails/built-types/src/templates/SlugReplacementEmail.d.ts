/// <reference types="react" />
import type { TFunction } from "next-i18next";
import { BaseEmailHtml } from "../components";
export declare const SlugReplacementEmail: (props: {
    slug: string;
    name: string;
    teamName: string;
    t: TFunction;
} & Partial<{
    children: import("react").ReactNode;
    callToAction?: import("react").ReactNode;
    subject: string;
    title?: string | undefined;
    subtitle?: import("react").ReactNode;
    headerType?: import("../components/EmailSchedulingBodyHeader").BodyHeadType | undefined;
    hideLogo?: boolean | undefined;
}>) => JSX.Element;
//# sourceMappingURL=SlugReplacementEmail.d.ts.map