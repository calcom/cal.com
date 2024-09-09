/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
export type OrgUpgradeBannerProps = {
    data: RouterOutputs["viewer"]["getUserTopBanners"]["orgUpgradeBanner"];
};
export declare function OrgUpgradeBanner({ data }: OrgUpgradeBannerProps): JSX.Element | null;
//# sourceMappingURL=OrgUpgradeBanner.d.ts.map