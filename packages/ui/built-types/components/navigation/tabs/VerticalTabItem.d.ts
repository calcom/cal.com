/// <reference types="react" />
import { type IconName } from "../../..";
export type VerticalTabItemProps = {
    name: string;
    info?: string;
    icon?: IconName;
    disabled?: boolean;
    children?: VerticalTabItemProps[];
    textClassNames?: string;
    className?: string;
    isChild?: boolean;
    hidden?: boolean;
    disableChevron?: boolean;
    href: string;
    isExternalLink?: boolean;
    linkShallow?: boolean;
    linkScroll?: boolean;
    avatar?: string;
    iconClassName?: string;
};
declare const VerticalTabItem: ({ name, href, info, isChild, disableChevron, linkShallow, linkScroll, ...props }: VerticalTabItemProps) => JSX.Element;
export default VerticalTabItem;
//# sourceMappingURL=VerticalTabItem.d.ts.map