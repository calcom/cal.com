/// <reference types="react" />
import type { HorizontalTabItemProps } from "./HorizontalTabItem";
export interface NavTabProps {
    tabs: HorizontalTabItemProps[];
    linkShallow?: boolean;
    linkScroll?: boolean;
    actions?: JSX.Element;
}
declare const HorizontalTabs: ({ tabs, linkShallow, linkScroll, actions, ...props }: NavTabProps) => JSX.Element;
export default HorizontalTabs;
//# sourceMappingURL=HorizontalTabs.d.ts.map