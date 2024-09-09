import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react";
import React from "react";
import type { User } from "@calcom/prisma/client";
import { type IconName } from "@calcom/ui";
export declare const ONBOARDING_INTRODUCED_AT: string;
export declare const ONBOARDING_NEXT_REDIRECT: {
    readonly redirect: {
        readonly permanent: false;
        readonly destination: "/getting-started";
    };
};
export declare const shouldShowOnboarding: (user: Pick<User, "createdDate" | "completedOnboarding"> & {
    organizationId: number | null;
}) => boolean;
type DrawerState = [isOpen: boolean, setDrawerOpen: Dispatch<SetStateAction<boolean>>];
export type LayoutProps = {
    centered?: boolean;
    title?: string;
    description?: string;
    heading?: ReactNode;
    subtitle?: ReactNode;
    headerClassName?: string;
    children: ReactNode;
    CTA?: ReactNode;
    large?: boolean;
    MobileNavigationContainer?: ReactNode;
    SidebarContainer?: ReactElement;
    TopNavContainer?: ReactNode;
    drawerState?: DrawerState;
    HeadingLeftIcon?: ReactNode;
    backPath?: string | boolean;
    flexChildrenContainer?: boolean;
    isPublic?: boolean;
    withoutMain?: boolean;
    withoutSeo?: boolean;
    actions?: JSX.Element;
    beforeCTAactions?: JSX.Element;
    afterHeading?: ReactNode;
    smallHeading?: boolean;
    hideHeadingOnMobile?: boolean;
    isPlatformUser?: boolean;
};
export default function Shell(props: LayoutProps): JSX.Element;
export type NavigationItemType = {
    name: string;
    href: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
    target?: HTMLAnchorElement["target"];
    badge?: React.ReactNode;
    icon?: IconName;
    child?: NavigationItemType[];
    pro?: true;
    onlyMobile?: boolean;
    onlyDesktop?: boolean;
    isCurrent?: ({ item, isChild, pathname, }: {
        item: Pick<NavigationItemType, "href">;
        isChild?: boolean;
        pathname: string | null;
    }) => boolean;
};
export declare function ShellMain(props: LayoutProps): JSX.Element;
export declare const MobileNavigationMoreItems: () => JSX.Element;
export {};
//# sourceMappingURL=Shell.d.ts.map