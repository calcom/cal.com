/// <reference types="react" />
import { type IconName } from "../../..";
export type HorizontalTabItemProps = {
    name: string;
    disabled?: boolean;
    className?: string;
    target?: string;
    href: string;
    linkShallow?: boolean;
    linkScroll?: boolean;
    icon?: IconName;
    avatar?: string;
};
declare const HorizontalTabItem: ({ name, href, linkShallow, linkScroll, avatar, ...props }: HorizontalTabItemProps) => JSX.Element;
export default HorizontalTabItem;
//# sourceMappingURL=HorizontalTabItem.d.ts.map