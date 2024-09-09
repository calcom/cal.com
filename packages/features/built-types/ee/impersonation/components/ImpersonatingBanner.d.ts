/// <reference types="react" />
import type { SessionContextValue } from "next-auth/react";
export type ImpersonatingBannerProps = {
    data: SessionContextValue["data"];
};
declare function ImpersonatingBanner({ data }: ImpersonatingBannerProps): JSX.Element | null;
export default ImpersonatingBanner;
//# sourceMappingURL=ImpersonatingBanner.d.ts.map