import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import React from "react";
declare const cvaCardTypeByVariant: (props?: ({
    variant?: "basic" | "ProfileCard" | "SidebarCard" | null | undefined;
    structure?: "description" | "title" | "image" | "card" | null | undefined;
} & import("class-variance-authority/dist/types").ClassProp) | undefined) => string;
type CVACardType = Required<Pick<VariantProps<typeof cvaCardTypeByVariant>, "variant">>;
export interface BaseCardProps extends CVACardType {
    image?: string;
    icon?: ReactNode;
    imageProps?: JSX.IntrinsicElements["img"];
    title: string;
    description: ReactNode;
    containerProps?: JSX.IntrinsicElements["div"];
    actionButton?: {
        href?: string;
        child: ReactNode;
        onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
        "data-testid"?: string;
    };
    learnMore?: {
        href: string;
        text: string;
    };
    mediaLink?: string;
    thumbnailUrl?: string;
    structure?: string;
}
export declare function Card({ image, title, icon, description, variant, actionButton, containerProps, imageProps, mediaLink, thumbnailUrl, learnMore, }: BaseCardProps): JSX.Element;
export default Card;
//# sourceMappingURL=Card.d.ts.map