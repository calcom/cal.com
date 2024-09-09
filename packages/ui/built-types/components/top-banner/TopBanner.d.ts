import type { ReactNode } from "react";
import { type IconName } from "../..";
export type TopBannerProps = {
    icon?: IconName;
    text: string;
    variant?: keyof typeof variantClassName;
    actions?: ReactNode;
};
declare const variantClassName: {
    default: string;
    warning: string;
    error: string;
};
export declare function TopBanner(props: TopBannerProps): JSX.Element;
export {};
//# sourceMappingURL=TopBanner.d.ts.map