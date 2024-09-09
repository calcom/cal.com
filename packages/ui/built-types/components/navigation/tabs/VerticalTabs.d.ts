/// <reference types="react" />
import type { VerticalTabItemProps } from "./VerticalTabItem";
import VerticalTabItem from "./VerticalTabItem";
export { VerticalTabItem };
export interface NavTabProps {
    tabs: VerticalTabItemProps[];
    children?: React.ReactNode;
    className?: string;
    sticky?: boolean;
    linkShallow?: boolean;
    linkScroll?: boolean;
    itemClassname?: string;
    iconClassName?: string;
}
declare const NavTabs: ({ tabs, className, sticky, linkShallow, linkScroll, itemClassname, iconClassName, ...props }: NavTabProps) => JSX.Element;
export default NavTabs;
//# sourceMappingURL=VerticalTabs.d.ts.map