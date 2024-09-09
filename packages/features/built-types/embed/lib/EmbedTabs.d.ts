/// <reference types="react" />
import type { EmbedType, PreviewState } from "../types";
export declare const tabs: ({
    name: string;
    href: string;
    icon: "code";
    type: string;
    Component: import("react").ForwardRefExoticComponent<{
        embedType: EmbedType;
        calLink: string;
        previewState: PreviewState;
        namespace: string;
    } & import("react").RefAttributes<HTMLIFrameElement | HTMLTextAreaElement | null>>;
} | {
    name: string;
    href: string;
    icon: "trello";
    type: string;
    Component: import("react").ForwardRefExoticComponent<{
        calLink: string;
        embedType: EmbedType;
        previewState: PreviewState;
        namespace: string;
    } & import("react").RefAttributes<HTMLIFrameElement | HTMLTextAreaElement | null>>;
})[];
//# sourceMappingURL=EmbedTabs.d.ts.map