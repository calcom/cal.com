import type { PreviewState } from "../types";
export declare const doWeNeedCalOriginProp: (embedCalOrigin: string) => boolean;
export declare const Codes: {
    react: {
        inline: ({ calLink, uiInstructionCode, previewState, embedCalOrigin, namespace, }: {
            calLink: string;
            uiInstructionCode: string;
            previewState: PreviewState["inline"];
            embedCalOrigin: string;
            namespace: string;
        }) => string;
        "floating-popup": ({ calLink, uiInstructionCode, previewState, embedCalOrigin, namespace, }: {
            calLink: string;
            embedCalOrigin: string;
            uiInstructionCode: string;
            namespace: string;
            previewState: PreviewState["floatingPopup"];
        }) => string;
        "element-click": ({ calLink, uiInstructionCode, previewState, embedCalOrigin, namespace, }: {
            calLink: string;
            uiInstructionCode: string;
            previewState: PreviewState["elementClick"];
            embedCalOrigin: string;
            namespace: string;
        }) => string;
    };
    HTML: {
        inline: ({ calLink, uiInstructionCode, previewState, namespace, }: {
            calLink: string;
            uiInstructionCode: string;
            previewState: PreviewState["inline"];
            namespace: string;
        }) => string;
        "floating-popup": ({ calLink, uiInstructionCode, previewState, namespace, }: {
            calLink: string;
            uiInstructionCode: string;
            previewState: PreviewState["floatingPopup"];
            namespace: string;
        }) => string;
        "element-click": ({ calLink, uiInstructionCode, previewState, namespace, }: {
            calLink: string;
            uiInstructionCode: string;
            previewState: PreviewState["elementClick"];
            namespace: string;
        }) => string;
    };
};
//# sourceMappingURL=EmbedCodes.d.ts.map