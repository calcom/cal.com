/// <reference types="react" />
type Maybe<T> = T | null | undefined;
export type OrgBannerProps = {
    alt: string;
    width?: number;
    height?: number;
    imageSrc?: Maybe<string>;
    fallback?: React.ReactNode;
    className?: string;
    "data-testid"?: string;
};
export declare function OrgBanner(props: OrgBannerProps): JSX.Element;
export {};
//# sourceMappingURL=OrgBanner.d.ts.map