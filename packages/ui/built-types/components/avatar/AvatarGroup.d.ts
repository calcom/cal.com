/// <reference types="react" />
export type AvatarGroupProps = {
    size: "sm" | "lg";
    items: {
        image: string;
        title?: string;
        alt?: string;
        href?: string | null;
    }[];
    className?: string;
    truncateAfter?: number;
    hideTruncatedAvatarsCount?: boolean;
};
export declare const AvatarGroup: (props: AvatarGroupProps) => JSX.Element;
//# sourceMappingURL=AvatarGroup.d.ts.map