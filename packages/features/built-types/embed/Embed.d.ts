/// <reference types="react" />
import type { EmbedTabs, EmbedType, EmbedTypes, PreviewState } from "./types";
export declare const EmbedDialog: ({ types, tabs, eventTypeHideOptionDisabled, }: {
    types: {
        title: string;
        subtitle: string;
        type: string;
        illustration: JSX.Element;
    }[];
    tabs: ({
        name: string;
        href: string;
        icon: "code";
        type: string;
        Component: import("react").ForwardRefExoticComponent<{
            embedType: EmbedType;
            calLink: string;
            previewState: PreviewState;
            namespace: string;
        } & import("react").RefAttributes<HTMLTextAreaElement | HTMLIFrameElement | null>>;
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
        } & import("react").RefAttributes<HTMLTextAreaElement | HTMLIFrameElement | null>>;
    })[];
    eventTypeHideOptionDisabled: boolean;
}) => JSX.Element;
type EmbedButtonProps<T> = {
    embedUrl: string;
    namespace: string;
    children?: React.ReactNode;
    className?: string;
    as?: T;
    eventId?: number;
};
export declare const EmbedButton: <T extends import("react").ElementType<any> = import("react").ForwardRefExoticComponent<import("@calcom/ui").ButtonProps & import("react").RefAttributes<HTMLButtonElement | HTMLAnchorElement>>>({ embedUrl, children, className, as, eventId, namespace, ...props }: EmbedButtonProps<T> & import("react").PropsWithoutRef<import("react").ComponentProps<T>>) => JSX.Element;
export {};
//# sourceMappingURL=Embed.d.ts.map