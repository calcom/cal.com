/// <reference types="react" />
import type { BadgeProps } from "../..";
type Action = {
    check: () => boolean;
    fn: () => void;
};
export default function FormCard({ children, label, deleteField, moveUp, moveDown, className, badge, ...restProps }: {
    children: React.ReactNode;
    label?: React.ReactNode;
    deleteField?: Action | null;
    moveUp?: Action | null;
    moveDown?: Action | null;
    className?: string;
    badge?: {
        text: string;
        href?: string;
        variant: BadgeProps["variant"];
    } | null;
} & JSX.IntrinsicElements["div"]): JSX.Element;
export {};
//# sourceMappingURL=FormCard.d.ts.map