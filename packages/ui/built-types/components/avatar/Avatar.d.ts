/// <reference types="react" />
type Maybe<T> = T | null | undefined;
export type AvatarProps = {
    className?: string;
    size?: "xxs" | "xs" | "xsm" | "sm" | "md" | "mdLg" | "lg" | "xl";
    imageSrc?: Maybe<string>;
    title?: string;
    alt: string;
    href?: string | null;
    fallback?: React.ReactNode;
    accepted?: boolean;
    asChild?: boolean;
    indicator?: React.ReactNode;
    "data-testid"?: string;
};
export declare function Avatar(props: AvatarProps): JSX.Element;
export {};
//# sourceMappingURL=Avatar.d.ts.map