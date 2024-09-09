import type { PropsWithChildren } from "react";
interface TroubleshooterListItemContainerProps {
    title: string;
    subtitle?: string;
    suffixSlot?: React.ReactNode;
    prefixSlot?: React.ReactNode;
    className?: string;
}
export declare function TroubleshooterListItemHeader({ prefixSlot, title, subtitle, suffixSlot, className, }: TroubleshooterListItemContainerProps): JSX.Element;
export declare function TroubleshooterListItemContainer({ children, ...rest }: PropsWithChildren<TroubleshooterListItemContainerProps>): JSX.Element;
export {};
//# sourceMappingURL=TroubleshooterListItemContainer.d.ts.map