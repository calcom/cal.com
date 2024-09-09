/// <reference types="react" />
import type { NextSeoProps } from "next-seo";
import type { AppImageProps, MeetingImageProps } from "@calcom/lib/OgImages";
export type HeadSeoProps = {
    title: string;
    description: string;
    siteName?: string;
    url?: string;
    canonical?: string;
    nextSeoProps?: NextSeoProps;
    app?: AppImageProps;
    meeting?: MeetingImageProps;
    isBrandingHidden?: boolean;
    origin?: string;
};
export declare const HeadSeo: (props: HeadSeoProps) => JSX.Element;
export default HeadSeo;
//# sourceMappingURL=HeadSeo.d.ts.map