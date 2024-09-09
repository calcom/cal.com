import type { ReactNode } from "react";
import React from "react";
import type { IconName } from "../..";
export declare function EmptyScreen({ Icon: icon, customIcon, avatar, headline, description, buttonText, buttonOnClick, buttonRaw, border, dashedBorder, className, iconClassName, iconWrapperClassName, limitWidth, }: {
    Icon?: IconName;
    customIcon?: React.ReactElement;
    avatar?: React.ReactElement;
    headline: string | React.ReactElement;
    description?: string | React.ReactElement;
    buttonText?: string;
    buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    buttonRaw?: ReactNode;
    border?: boolean;
    dashedBorder?: boolean;
    iconWrapperClassName?: string;
    iconClassName?: string;
    limitWidth?: boolean;
} & React.HTMLAttributes<HTMLDivElement>): JSX.Element;
//# sourceMappingURL=EmptyScreen.d.ts.map