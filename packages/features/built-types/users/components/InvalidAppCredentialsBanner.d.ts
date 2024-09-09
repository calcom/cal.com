/// <reference types="react" />
import { type RouterOutputs } from "@calcom/trpc";
export type InvalidAppCredentialBannersProps = {
    data: RouterOutputs["viewer"]["getUserTopBanners"]["invalidAppCredentialBanners"];
};
export declare function InvalidAppCredentialBanners({ data }: InvalidAppCredentialBannersProps): JSX.Element | null;
export type InvalidAppCredentialBannerProps = {
    name: string;
    slug: string;
};
export declare function InvalidAppCredentialBanner({ name, slug }: InvalidAppCredentialBannerProps): JSX.Element;
//# sourceMappingURL=InvalidAppCredentialsBanner.d.ts.map