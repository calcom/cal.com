import type { FC } from "react";
import React from "react";
import type { IconName } from "../..";
import type { ButtonBaseProps } from "../button";
export type ActionType = {
    id: string;
    icon?: IconName;
    iconClassName?: string;
    label: string;
    disabled?: boolean;
    color?: ButtonBaseProps["color"];
    bookingId?: number;
} & ({
    href: string;
    onClick?: never;
    actions?: never;
} | {
    href?: never;
    onClick: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
    actions?: never;
} | {
    actions?: ActionType[];
    href?: never;
    onClick?: never;
});
interface Props {
    actions: ActionType[];
}
export declare const DropdownActions: ({ actions, actionTrigger, }: {
    actions: ActionType[];
    actionTrigger?: React.ReactNode;
}) => JSX.Element;
export declare const TableActions: FC<Props>;
export {};
//# sourceMappingURL=TableActions.d.ts.map