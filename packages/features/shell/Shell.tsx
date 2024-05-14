import type { User as UserAuth } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react";
import React, { cloneElement, Fragment, useEffect, useMemo, useState } from "react";
import { Toaster } from "react-hot-toast";

import dayjs from "@calcom/dayjs";
import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import UnconfirmedBookingBadge from "@calcom/features/bookings/UnconfirmedBookingBadge";
import ImpersonatingBanner, {
  type ImpersonatingBannerProps,
} from "@calcom/features/ee/impersonation/components/ImpersonatingBanner";
import {
  OrgUpgradeBanner,
  type OrgUpgradeBannerProps,
} from "@calcom/features/ee/organizations/components/OrgUpgradeBanner";
import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import HelpMenuItem from "@calcom/features/ee/support/components/HelpMenuItem";
import useIntercom, { isInterComEnabled } from "@calcom/features/ee/support/lib/intercom/useIntercom";
import { TeamsUpgradeBanner, type TeamsUpgradeBannerProps } from "@calcom/features/ee/teams/components";
import { useFlagMap } from "@calcom/features/flags/context/provider";
import { KBarContent, KBarRoot, KBarTrigger } from "@calcom/features/kbar/Kbar";
import TimezoneChangeDialog from "@calcom/features/settings/TimezoneChangeDialog";
import AdminPasswordBanner, {
  type AdminPasswordBannerProps,
} from "@calcom/features/users/components/AdminPasswordBanner";
import CalendarCredentialBanner, {
  type CalendarCredentialBannerProps,
} from "@calcom/features/users/components/CalendarCredentialBanner";
import {
  InvalidAppCredentialBanners,
  type InvalidAppCredentialBannersProps,
} from "@calcom/features/users/components/InvalidAppCredentialsBanner";
import UserV2OptInBanner from "@calcom/features/users/components/UserV2OptInBanner";
import VerifyEmailBanner, {
  type VerifyEmailBannerProps,
} from "@calcom/features/users/components/VerifyEmailBanner";
import classNames from "@calcom/lib/classNames";
import {
  APP_NAME,
  DESKTOP_APP_LINK,
  ENABLE_PROFILE_SWITCHER,
  IS_VISUAL_REGRESSION_TESTING,
  JOIN_DISCORD,
  ROADMAP,
  TOP_BANNER_HEIGHT,
  WEBAPP_URL,
} from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useFormbricks } from "@calcom/lib/formbricks-client";
import getBrandColours from "@calcom/lib/getBrandColours";
import { useBookerUrl } from "@calcom/lib/hooks/useBookerUrl";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useTheme from "@calcom/lib/hooks/useTheme";
import { isKeyInObject } from "@calcom/lib/isKeyInObject";
import { localStorage } from "@calcom/lib/webstorage";
import type { User } from "@calcom/prisma/client";
import { trpc } from "@calcom/trpc/react";
import useEmailVerifyCheck from "@calcom/trpc/react/hooks/useEmailVerifyCheck";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import {
  Avatar,
  Button,
  ButtonOrLink,
  Credits,
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorBoundary,
  HeadSeo,
  Icon,
  Logo,
  showToast,
  SkeletonText,
  Tooltip,
  useCalcomTheme,
  type IconName,
} from "@calcom/ui";
import { Discord } from "@calcom/ui/components/icon/Discord";

import { useOrgBranding } from "../ee/organizations/context/provider";
import FreshChatProvider from "../ee/support/lib/freshchat/FreshChatProvider";
import { TeamInviteBadge } from "./TeamInviteBadge";

// need to import without ssr to prevent hydration errors
const Tips = dynamic(() => import("@calcom/features/tips").then((mod) => mod.Tips), {
  ssr: false,
});

/* TODO: Migate this */

export const ONBOARDING_INTRODUCED_AT = dayjs("September 1 2021").toISOString();

export const ONBOARDING_NEXT_REDIRECT = {
  redirect: {
    permanent: false,
    destination: "/getting-started",
  },
} as const;

export const shouldShowOnboarding = (
  user: Pick<User, "createdDate" | "completedOnboarding"> & {
    organizationId: number | null;
  }
) => {
  return (
    !user.completedOnboarding &&
    !user.organizationId &&
    dayjs(user.createdDate).isAfter(ONBOARDING_INTRODUCED_AT)
  );
};

function useRedirectToLoginIfUnauthenticated(isPublic = false) {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const router = useRouter();
  useEffect(() => {
    if (isPublic) {
      return;
    }

    if (!loading && !session) {
      const urlSearchParams = new URLSearchParams();
      urlSearchParams.set("callbackUrl", `${WEBAPP_URL}${location.pathname}${location.search}`);
      router.replace(`/auth/login?${urlSearchParams.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, isPublic]);

  return {
    loading: loading && !session,
    session,
  };
}

type BannerTypeProps = {
  teamUpgradeBanner: TeamsUpgradeBannerProps;
  orgUpgradeBanner: OrgUpgradeBannerProps;
  verifyEmailBanner: VerifyEmailBannerProps;
  adminPasswordBanner: AdminPasswordBannerProps;
  impersonationBanner: ImpersonatingBannerProps;
  calendarCredentialBanner: CalendarCredentialBannerProps;
  invalidAppCredentialBanners: InvalidAppCredentialBannersProps;
};

type BannerType = keyof BannerTypeProps;

type BannerComponent = {
  [Key in BannerType]: (props: BannerTypeProps[Key]) => JSX.Element;
};

const BannerComponent: BannerComponent = {
  teamUpgradeBanner: (props: TeamsUpgradeBannerProps) => <TeamsUpgradeBanner {...props} />,
  orgUpgradeBanner: (props: OrgUpgradeBannerProps) => <OrgUpgradeBanner {...props} />,
  verifyEmailBanner: (props: VerifyEmailBannerProps) => <VerifyEmailBanner {...props} />,
  adminPasswordBanner: (props: AdminPasswordBannerProps) => <AdminPasswordBanner {...props} />,
  impersonationBanner: (props: ImpersonatingBannerProps) => <ImpersonatingBanner {...props} />,
  calendarCredentialBanner: (props: CalendarCredentialBannerProps) => <CalendarCredentialBanner {...props} />,
  invalidAppCredentialBanners: (props: InvalidAppCredentialBannersProps) => (
    <InvalidAppCredentialBanners {...props} />
  ),
};

function useRedirectToOnboardingIfNeeded() {
  const router = useRouter();
  const query = useMeQuery();
  const user = query.data;
  const flags = useFlagMap();

  const { data: email } = useEmailVerifyCheck();

  const needsEmailVerification = !email?.isVerified && flags["email-verification"];

  const isRedirectingToOnboarding = user && shouldShowOnboarding(user);

  useEffect(() => {
    if (isRedirectingToOnboarding && !needsEmailVerification) {
      router.replace("/getting-started");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRedirectingToOnboarding, needsEmailVerification]);

  return {
    isRedirectingToOnboarding,
  };
}

type allBannerProps = { [Key in BannerType]: BannerTypeProps[Key]["data"] };

const useBanners = () => {
  const { data: getUserTopBanners, isPending } = trpc.viewer.getUserTopBanners.useQuery();
  const { data: userSession } = useSession();

  if (isPending || !userSession) return null;

  const isUserInactiveAdmin = userSession?.user.role === "INACTIVE_ADMIN";
  const userImpersonatedByUID = userSession?.user.impersonatedBy?.id;

  const userSessionBanners = {
    adminPasswordBanner: isUserInactiveAdmin ? userSession : null,
    impersonationBanner: userImpersonatedByUID ? userSession : null,
  };

  const allBanners: allBannerProps = Object.assign({}, getUserTopBanners, userSessionBanners);

  return allBanners;
};

const Layout = (props: LayoutProps) => {
  const banners = useBanners();

  const { data: user } = trpc.viewer.me.useQuery();
  const { boot } = useIntercom();
  const pageTitle = typeof props.heading === "string" && !props.title ? props.heading : props.title;

  useEffect(() => {
    // not using useMediaQuery as it toggles between true and false
    const showIntercom = localStorage.getItem("showIntercom");
    if (!isInterComEnabled || showIntercom === "false" || window.innerWidth <= 768 || !user) return;
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const bannersHeight = useMemo(() => {
    const activeBanners =
      banners &&
      Object.entries(banners).filter(([_, value]) => {
        return value && (!Array.isArray(value) || value.length > 0);
      });
    return (activeBanners?.length ?? 0) * TOP_BANNER_HEIGHT;
  }, [banners]);

  useFormbricks();

  return (
    <>
      {!props.withoutSeo && (
        <HeadSeo
          title={pageTitle ?? APP_NAME}
          description={props.description ?? props.subtitle?.toString() ?? ""}
        />
      )}
      <div>
        <Toaster position="bottom-right" />
      </div>

      <TimezoneChangeDialog />

      <div className="flex min-h-screen flex-col">
        {banners && !props.isPlatformUser && (
          <div className="sticky top-0 z-10 w-full divide-y divide-black">
            <UserV2OptInBanner />
            {Object.keys(banners).map((key) => {
              if (key === "teamUpgradeBanner") {
                const Banner = BannerComponent[key];
                return <Banner data={banners[key]} key={key} />;
              } else if (key === "orgUpgradeBanner") {
                const Banner = BannerComponent[key];
                return <Banner data={banners[key]} key={key} />;
              } else if (key === "verifyEmailBanner") {
                const Banner = BannerComponent[key];
                return <Banner data={banners[key]} key={key} />;
              } else if (key === "adminPasswordBanner") {
                const Banner = BannerComponent[key];
                return <Banner data={banners[key]} key={key} />;
              } else if (key === "impersonationBanner") {
                const Banner = BannerComponent[key];
                return <Banner data={banners[key]} key={key} />;
              } else if (key === "calendarCredentialBanner") {
                const Banner = BannerComponent[key];
                return <Banner data={banners[key]} key={key} />;
              } else if (key === "invalidAppCredentialBanners") {
                const Banner = BannerComponent[key];
                return <Banner data={banners[key]} key={key} />;
              }
            })}
          </div>
        )}

        <div className="flex flex-1" data-testid="dashboard-shell">
          {props.SidebarContainer ? (
            cloneElement(props.SidebarContainer, { bannersHeight })
          ) : (
            <SideBarContainer isPlatformUser={props.isPlatformUser} bannersHeight={bannersHeight} />
          )}
          <div className="flex w-0 flex-1 flex-col">
            <MainContainer {...props} />
          </div>
        </div>
      </div>
    </>
  );
};

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
  backPath?: string | boolean; // renders back button to specified path
  // use when content needs to expand with flex
  flexChildrenContainer?: boolean;
  isPublic?: boolean;
  withoutMain?: boolean;
  // Gives you the option to skip HeadSEO and render your own.
  withoutSeo?: boolean;
  // Gives the ability to include actions to the right of the heading
  actions?: JSX.Element;
  beforeCTAactions?: JSX.Element;
  afterHeading?: ReactNode;
  smallHeading?: boolean;
  hideHeadingOnMobile?: boolean;
  isPlatformUser?: boolean;
};

const useAppTheme = () => {
  const { data: user } = useMeQuery();
  const brandTheme = getBrandColours({
    lightVal: user?.brandColor,
    darkVal: user?.darkBrandColor,
  });
  useCalcomTheme(brandTheme);
  useTheme(user?.appTheme);
};

const KBarWrapper = ({ children, withKBar = false }: { withKBar: boolean; children: React.ReactNode }) =>
  withKBar ? (
    <KBarRoot>
      {children}
      <KBarContent />
    </KBarRoot>
  ) : (
    <>{children}</>
  );

const PublicShell = (props: LayoutProps) => {
  const { status } = useSession();
  return (
    <KBarWrapper withKBar={status === "authenticated"}>
      <Layout {...props} />
    </KBarWrapper>
  );
};

export default function Shell(props: LayoutProps) {
  // if a page is unauthed and isPublic is true, the redirect does not happen.
  useRedirectToLoginIfUnauthenticated(props.isPublic);
  useRedirectToOnboardingIfNeeded();
  useAppTheme();

  return !props.isPublic ? (
    <KBarWrapper withKBar>
      <Layout {...props} />
    </KBarWrapper>
  ) : (
    <PublicShell {...props} />
  );
}

interface UserDropdownProps {
  small?: boolean;
}

function UserDropdown({ small }: UserDropdownProps) {
  const { t } = useLocale();
  const { data: user } = useMeQuery();
  const utils = trpc.useUtils();
  const bookerUrl = useBookerUrl();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const Beacon = window.Beacon;
    // window.Beacon is defined when user actually opens up HelpScout and username is available here. On every re-render update session info, so that it is always latest.
    Beacon &&
      Beacon("session-data", {
        username: user?.username || "Unknown",
        screenResolution: `${screen.width}x${screen.height}`,
      });
  });

  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const onHelpItemSelect = () => {
    setHelpOpen(false);
    setMenuOpen(false);
  };

  // Prevent rendering dropdown if user isn't available.
  // We don't want to show nameless user.
  if (!user) {
    return null;
  }

  return (
    <Dropdown open={menuOpen}>
      <DropdownMenuTrigger asChild onClick={() => setMenuOpen((menuOpen) => !menuOpen)}>
        <button
          data-testid="user-dropdown-trigger-button"
          className={classNames(
            "hover:bg-emphasis todesktop:!bg-transparent group mx-0 flex w-full cursor-pointer appearance-none items-center rounded-full text-left outline-none transition focus:outline-none focus:ring-0 md:rounded-none lg:rounded",
            small ? "p-2" : "px-2 py-1.5"
          )}>
          <span
            className={classNames(
              small ? "h-4 w-4" : "h-5 w-5 ltr:mr-2 rtl:ml-2",
              "relative flex-shrink-0 rounded-full "
            )}>
            <Avatar
              size={small ? "xs" : "xsm"}
              imageSrc={`${user.avatarUrl || user.avatar}`}
              alt={user.username || "Nameless User"}
              className="overflow-hidden"
            />
            <span
              className={classNames(
                "border-muted absolute -bottom-1 -right-1 rounded-full border bg-green-500",
                small ? "-bottom-0.5 -right-0.5 h-2.5 w-2.5" : "-bottom-0.5 -right-0 h-2 w-2"
              )}
            />
          </span>
          {!small && (
            <span className="flex flex-grow items-center gap-2">
              <span className="w-24 flex-shrink-0 text-sm leading-none">
                <span className="text-emphasis block truncate font-medium">
                  {user.name || "Nameless User"}
                </span>
              </span>
              <Icon
                name="chevron-down"
                className="group-hover:text-subtle text-muted h-4 w-4 flex-shrink-0 rtl:mr-4"
                aria-hidden="true"
              />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <FreshChatProvider>
          <DropdownMenuContent
            align="start"
            onInteractOutside={() => {
              setMenuOpen(false);
              setHelpOpen(false);
            }}
            className="group overflow-hidden rounded-md">
            {helpOpen ? (
              <HelpMenuItem onHelpItemSelect={() => onHelpItemSelect()} />
            ) : (
              <>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    CustomStartIcon={<Icon name="user" className="text-default h-4 w-4" aria-hidden="true" />}
                    href="/settings/my-account/profile">
                    {t("my_profile")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    CustomStartIcon={
                      <Icon name="settings" className="text-default h-4 w-4" aria-hidden="true" />
                    }
                    href="/settings/my-account/general">
                    {t("my_settings")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    CustomStartIcon={<Icon name="moon" className="text-default h-4 w-4" aria-hidden="true" />}
                    href="/settings/my-account/out-of-office">
                    {t("out_of_office")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <DropdownItem
                    CustomStartIcon={<Discord className="text-default h-4 w-4" />}
                    target="_blank"
                    rel="noreferrer"
                    href={JOIN_DISCORD}>
                    {t("join_our_discord")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem StartIcon="map" target="_blank" href={ROADMAP}>
                    {t("visit_roadmap")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    StartIcon="circle-help"
                    aria-hidden="true"
                    onClick={() => setHelpOpen(true)}>
                    {t("help")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem className="todesktop:hidden hidden lg:flex">
                  <DropdownItem StartIcon="download" target="_blank" rel="noreferrer" href={DESKTOP_APP_LINK}>
                    {t("download_desktop_app")}
                  </DropdownItem>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    StartIcon="log-out"
                    aria-hidden="true"
                    onClick={() => signOut({ callbackUrl: "/auth/logout" })}>
                    {t("sign_out")}
                  </DropdownItem>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </FreshChatProvider>
      </DropdownMenuPortal>
    </Dropdown>
  );
}

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
  isCurrent?: ({
    item,
    isChild,
    pathname,
  }: {
    item: Pick<NavigationItemType, "href">;
    isChild?: boolean;
    pathname: string | null;
  }) => boolean;
};

const requiredCredentialNavigationItems = ["Routing Forms"];
const MORE_SEPARATOR_NAME = "more";

const navigation: NavigationItemType[] = [
  {
    name: "event_types_page_title",
    href: "/event-types",
    icon: "link",
  },
  {
    name: "bookings",
    href: "/bookings/upcoming",
    icon: "calendar",
    badge: <UnconfirmedBookingBadge />,
    isCurrent: ({ pathname }) => pathname?.startsWith("/bookings") ?? false,
  },
  {
    name: "availability",
    href: "/availability",
    icon: "clock",
  },
  {
    name: "teams",
    href: "/teams",
    icon: "users",
    onlyDesktop: true,
    badge: <TeamInviteBadge />,
  },
  {
    name: "apps",
    href: "/apps",
    icon: "grid-3x3",
    isCurrent: ({ pathname: path, item }) => {
      // During Server rendering path is /v2/apps but on client it becomes /apps(weird..)
      return (path?.startsWith(item.href) ?? false) && !(path?.includes("routing-forms/") ?? false);
    },
    child: [
      {
        name: "app_store",
        href: "/apps",
        isCurrent: ({ pathname: path, item }) => {
          // During Server rendering path is /v2/apps but on client it becomes /apps(weird..)
          return (
            (path?.startsWith(item.href) ?? false) &&
            !(path?.includes("routing-forms/") ?? false) &&
            !(path?.includes("/installed") ?? false)
          );
        },
      },
      {
        name: "installed_apps",
        href: "/apps/installed/calendar",
        isCurrent: ({ pathname: path }) =>
          (path?.startsWith("/apps/installed/") ?? false) ||
          (path?.startsWith("/v2/apps/installed/") ?? false),
      },
    ],
  },
  {
    name: MORE_SEPARATOR_NAME,
    href: "/more",
    icon: "ellipsis",
  },
  {
    name: "Routing Forms",
    href: "/apps/routing-forms/forms",
    icon: "file-text",
    isCurrent: ({ pathname }) => pathname?.startsWith("/apps/routing-forms/") ?? false,
  },
  {
    name: "workflows",
    href: "/workflows",
    icon: "zap",
  },
  {
    name: "insights",
    href: "/insights",
    icon: "bar-chart",
  },
];

const platformNavigation: NavigationItemType[] = [
  {
    name: "Dashboard",
    href: "/settings/platform/",
    icon: "layout-dashboard",
  },
  {
    name: "Documentation",
    href: "https://docs.cal.com/docs/platform",
    icon: "bar-chart",
    target: "_blank",
  },
  {
    name: "API reference",
    href: "https://api.cal.com/v2/docs#/",
    icon: "terminal",
    target: "_blank",
  },
  {
    name: "Atoms",
    href: "https://docs.cal.com/docs/platform#atoms",
    icon: "atom",
    target: "_blank",
  },
  {
    name: MORE_SEPARATOR_NAME,
    href: "https://docs.cal.com/docs/platform/faq",
    icon: "ellipsis",
    target: "_blank",
  },
];

const getDesktopNavigationItems = (isPlatformNavigation = false) => {
  const navigationType = !isPlatformNavigation ? navigation : platformNavigation;
  const moreSeparatorIndex = navigationType.findIndex((item) => item.name === MORE_SEPARATOR_NAME);

  const { desktopNavigationItems, mobileNavigationBottomItems, mobileNavigationMoreItems } = (
    !isPlatformNavigation ? navigation : platformNavigation
  ).reduce<Record<string, NavigationItemType[]>>(
    (items, item, index) => {
      // We filter out the "more" separator in` desktop navigation
      if (item.name !== MORE_SEPARATOR_NAME) items.desktopNavigationItems.push(item);
      // Items for mobile bottom navigation
      if (index < moreSeparatorIndex + 1 && !item.onlyDesktop) {
        items.mobileNavigationBottomItems.push(item);
      } // Items for the "more" menu in mobile navigation
      else {
        items.mobileNavigationMoreItems.push(item);
      }
      return items;
    },
    { desktopNavigationItems: [], mobileNavigationBottomItems: [], mobileNavigationMoreItems: [] }
  );

  return { desktopNavigationItems, mobileNavigationBottomItems, mobileNavigationMoreItems };
};

const Navigation = ({ isPlatformNavigation = false }: { isPlatformNavigation?: boolean }) => {
  const { desktopNavigationItems } = getDesktopNavigationItems(isPlatformNavigation);

  return (
    <nav className="mt-2 flex-1 md:px-2 lg:mt-4 lg:px-0">
      {desktopNavigationItems.map((item) => (
        <NavigationItem key={item.name} item={item} />
      ))}
      <div className="text-subtle mt-0.5 lg:hidden">
        <KBarTrigger />
      </div>
    </nav>
  );
};

function useShouldDisplayNavigationItem(item: NavigationItemType) {
  const flags = useFlagMap();
  if (isKeyInObject(item.name, flags)) return flags[item.name];
  return true;
}

const defaultIsCurrent: NavigationItemType["isCurrent"] = ({ isChild, item, pathname }) => {
  return isChild ? item.href === pathname : item.href ? pathname?.startsWith(item.href) ?? false : false;
};

const NavigationItem: React.FC<{
  index?: number;
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item, isChild } = props;
  const { t, isLocaleReady } = useLocale();
  const pathname = usePathname();
  const isCurrent: NavigationItemType["isCurrent"] = item.isCurrent || defaultIsCurrent;
  const current = isCurrent({ isChild: !!isChild, item, pathname });
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(props.item);

  if (!shouldDisplayNavigationItem) return null;

  return (
    <Fragment>
      <Tooltip side="right" content={t(item.name)} className="lg:hidden">
        <Link
          data-test-id={item.name}
          href={item.href}
          aria-label={t(item.name)}
          target={item.target}
          className={classNames(
            "todesktop:py-[7px] text-default group flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition",
            item.child ? `[&[aria-current='page']]:!bg-transparent` : `[&[aria-current='page']]:bg-emphasis`,
            isChild
              ? `[&[aria-current='page']]:text-emphasis [&[aria-current='page']]:bg-emphasis hidden h-8 pl-16 lg:flex lg:pl-11 ${
                  props.index === 0 ? "mt-0" : "mt-px"
                }`
              : "[&[aria-current='page']]:text-emphasis mt-0.5 text-sm",
            isLocaleReady
              ? "hover:bg-subtle todesktop:[&[aria-current='page']]:bg-emphasis todesktop:hover:bg-transparent hover:text-emphasis"
              : ""
          )}
          aria-current={current ? "page" : undefined}>
          {item.icon && (
            <Icon
              name={item.icon}
              className="todesktop:!text-blue-500 mr-2 h-4 w-4 flex-shrink-0 rtl:ml-2 md:ltr:mx-auto lg:ltr:mr-2 [&[aria-current='page']]:text-inherit"
              aria-hidden="true"
              aria-current={current ? "page" : undefined}
            />
          )}
          {isLocaleReady ? (
            <span
              className="hidden w-full justify-between truncate text-ellipsis lg:flex"
              data-testid={`${item.name}-test`}>
              {t(item.name)}
              {item.badge && item.badge}
            </span>
          ) : (
            <SkeletonText className="h-[20px] w-full" />
          )}
        </Link>
      </Tooltip>
      {item.child &&
        isCurrent({ pathname, isChild, item }) &&
        item.child.map((item, index) => <NavigationItem index={index} key={item.name} item={item} isChild />)}
    </Fragment>
  );
};

function MobileNavigationContainer({ isPlatformNavigation = false }: { isPlatformNavigation?: boolean }) {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return <MobileNavigation isPlatformNavigation={isPlatformNavigation} />;
}

const MobileNavigation = ({ isPlatformNavigation = false }: { isPlatformNavigation?: boolean }) => {
  const isEmbed = useIsEmbed();
  const { mobileNavigationBottomItems } = getDesktopNavigationItems(isPlatformNavigation);

  return (
    <>
      <nav
        className={classNames(
          "pwa:pb-[max(0.625rem,env(safe-area-inset-bottom))] pwa:-mx-2 bg-muted border-subtle fixed bottom-0 left-0 z-30 flex w-full border-t bg-opacity-40 px-1 shadow backdrop-blur-md md:hidden",
          isEmbed && "hidden"
        )}>
        {mobileNavigationBottomItems.map((item) => (
          <MobileNavigationItem key={item.name} item={item} />
        ))}
      </nav>
      {/* add padding to content for mobile navigation*/}
      <div className="block pt-12 md:hidden" />
    </>
  );
};

const MobileNavigationItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item, isChild } = props;
  const pathname = usePathname();
  const { t, isLocaleReady } = useLocale();
  const isCurrent: NavigationItemType["isCurrent"] = item.isCurrent || defaultIsCurrent;
  const current = isCurrent({ isChild: !!isChild, item, pathname });
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(props.item);

  if (!shouldDisplayNavigationItem) return null;
  return (
    <Link
      key={item.name}
      href={item.href}
      target={item.target}
      className="[&[aria-current='page']]:text-emphasis hover:text-default text-muted relative my-2 min-w-0 flex-1 overflow-hidden rounded-md !bg-transparent p-1 text-center text-xs font-medium focus:z-10 sm:text-sm"
      aria-current={current ? "page" : undefined}>
      {item.badge && <div className="absolute right-1 top-1">{item.badge}</div>}
      {item.icon && (
        <Icon
          name={item.icon}
          className="[&[aria-current='page']]:text-emphasis  mx-auto mb-1 block h-5 w-5 flex-shrink-0 text-center text-inherit"
          aria-hidden="true"
          aria-current={current ? "page" : undefined}
        />
      )}
      {isLocaleReady ? <span className="block truncate">{t(item.name)}</span> : <SkeletonText />}
    </Link>
  );
};

const MobileNavigationMoreItem: React.FC<{
  item: NavigationItemType;
  isChild?: boolean;
}> = (props) => {
  const { item } = props;
  const { t, isLocaleReady } = useLocale();
  const shouldDisplayNavigationItem = useShouldDisplayNavigationItem(props.item);

  if (!shouldDisplayNavigationItem) return null;

  return (
    <li className="border-subtle border-b last:border-b-0" key={item.name}>
      <Link href={item.href} className="hover:bg-subtle flex items-center justify-between p-5 transition">
        <span className="text-default flex items-center font-semibold ">
          {item.icon && (
            <Icon name={item.icon} className="h-5 w-5 flex-shrink-0 ltr:mr-3 rtl:ml-3" aria-hidden="true" />
          )}
          {isLocaleReady ? t(item.name) : <SkeletonText />}
        </span>
        <Icon name="arrow-right" className="text-subtle h-5 w-5" />
      </Link>
    </li>
  );
};

type SideBarContainerProps = {
  bannersHeight: number;
  isPlatformUser?: boolean;
};

type SideBarProps = {
  bannersHeight: number;
  user?: UserAuth | null;
  isPlatformUser?: boolean;
};

function SideBarContainer({ bannersHeight, isPlatformUser = false }: SideBarContainerProps) {
  const { status, data } = useSession();

  // Make sure that Sidebar is rendered optimistically so that a refresh of pages when logged in have SideBar from the beginning.
  // This improves the experience of refresh on app store pages(when logged in) which are SSG.
  // Though when logged out, app store pages would temporarily show SideBar until session status is confirmed.
  if (status !== "loading" && status !== "authenticated") return null;
  return <SideBar isPlatformUser={isPlatformUser} bannersHeight={bannersHeight} user={data?.user} />;
}

function SideBar({ bannersHeight, user, isPlatformUser = false }: SideBarProps) {
  const { t, isLocaleReady } = useLocale();
  const orgBranding = useOrgBranding();

  const publicPageUrl = useMemo(() => {
    if (!user?.org?.id) return `${process.env.NEXT_PUBLIC_WEBSITE_URL}/${user?.username}`;
    const publicPageUrl = orgBranding?.slug ? getOrgFullOrigin(orgBranding.slug) : "";
    return publicPageUrl;
  }, [orgBranding?.slug, user?.username, user?.org?.id]);

  const bottomNavItems: NavigationItemType[] = [
    {
      name: "view_public_page",
      href: publicPageUrl,
      icon: "external-link",
      target: "__blank",
    },
    {
      name: "copy_public_page_link",
      href: "",
      onClick: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        navigator.clipboard.writeText(publicPageUrl);
        showToast(t("link_copied"), "success");
      },
      icon: "copy",
    },
    {
      name: "settings",
      href: user?.org ? `/settings/organizations/profile` : "/settings/my-account/profile",
      icon: "settings",
    },
  ];
  return (
    <div className="relative">
      <aside
        style={{ maxHeight: `calc(100vh - ${bannersHeight}px)`, top: `${bannersHeight}px` }}
        className="bg-muted border-muted fixed left-0 hidden h-full max-h-screen w-14 flex-col overflow-y-auto overflow-x-hidden border-r md:sticky md:flex lg:w-56 lg:px-3">
        <div className="flex h-full flex-col justify-between py-3 lg:pt-4">
          <header className="todesktop:-mt-3 todesktop:flex-col-reverse todesktop:[-webkit-app-region:drag] items-center justify-between md:hidden lg:flex">
            {orgBranding ? (
              !ENABLE_PROFILE_SWITCHER ? (
                <Link href="/settings/organizations/profile" className="w-full px-1.5">
                  <div className="flex items-center gap-2 font-medium">
                    <Avatar
                      alt={`${orgBranding.name} logo`}
                      imageSrc={getPlaceholderAvatar(orgBranding.logoUrl, orgBranding.name)}
                      size="xsm"
                    />
                    <p className="text line-clamp-1 text-sm">
                      <span>{orgBranding.name}</span>
                    </p>
                  </div>
                </Link>
              ) : (
                <ProfileDropdown />
              )
            ) : (
              <div data-testid="user-dropdown-trigger" className="todesktop:mt-4 w-full">
                <span className="hidden lg:inline">
                  <UserDropdown />
                </span>
                <span className="hidden md:inline lg:hidden">
                  <UserDropdown small />
                </span>
              </div>
            )}
            <div className="flex justify-end rtl:space-x-reverse">
              <button
                color="minimal"
                onClick={() => window.history.back()}
                className="todesktop:block hover:text-emphasis text-subtle group hidden text-sm font-medium">
                <Icon
                  name="arrow-left"
                  className="group-hover:text-emphasis text-subtle h-4 w-4 flex-shrink-0"
                />
              </button>
              <button
                color="minimal"
                onClick={() => window.history.forward()}
                className="todesktop:block hover:text-emphasis text-subtle group hidden text-sm font-medium">
                <Icon
                  name="arrow-right"
                  className="group-hover:text-emphasis text-subtle h-4 w-4 flex-shrink-0"
                />
              </button>
              {!!orgBranding && (
                <div data-testid="user-dropdown-trigger" className="flex items-center">
                  <UserDropdown small />
                </div>
              )}
              <KBarTrigger />
            </div>
          </header>
          {/* logo icon for tablet */}
          <Link href="/event-types" className="text-center md:inline lg:hidden">
            <Logo small icon />
          </Link>
          <Navigation isPlatformNavigation={isPlatformUser} />
        </div>

        {!isPlatformUser && (
          <div>
            <Tips />
            {bottomNavItems.map((item, index) => (
              <Tooltip side="right" content={t(item.name)} className="lg:hidden" key={item.name}>
                <ButtonOrLink
                  id={item.name}
                  href={item.href || undefined}
                  aria-label={t(item.name)}
                  target={item.target}
                  className={classNames(
                    "text-left",
                    "[&[aria-current='page']]:bg-emphasis text-default justify-right group flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition",
                    "[&[aria-current='page']]:text-emphasis mt-0.5 w-full text-sm",
                    isLocaleReady ? "hover:bg-emphasis hover:text-emphasis" : "",
                    index === 0 && "mt-3"
                  )}
                  onClick={item.onClick}>
                  {!!item.icon && (
                    <Icon
                      name={item.icon}
                      className={classNames(
                        "h-4 w-4 flex-shrink-0 [&[aria-current='page']]:text-inherit",
                        "me-3 md:mx-auto lg:ltr:mr-2 lg:rtl:ml-2"
                      )}
                      aria-hidden="true"
                    />
                  )}
                  {isLocaleReady ? (
                    <span className="hidden w-full justify-between lg:flex">
                      <div className="flex">{t(item.name)}</div>
                    </span>
                  ) : (
                    <SkeletonText className="h-[20px] w-full" />
                  )}
                </ButtonOrLink>
              </Tooltip>
            ))}
            {!IS_VISUAL_REGRESSION_TESTING && <Credits />}
          </div>
        )}
      </aside>
    </div>
  );
}

export function ShellMain(props: LayoutProps) {
  const router = useRouter();
  const { isLocaleReady } = useLocale();

  return (
    <>
      {(props.heading || !!props.backPath) && (
        <div
          className={classNames(
            "flex items-center md:mb-6 md:mt-0",
            props.smallHeading ? "lg:mb-7" : "lg:mb-8",
            props.hideHeadingOnMobile ? "mb-0" : "mb-6"
          )}>
          {!!props.backPath && (
            <Button
              variant="icon"
              size="sm"
              color="minimal"
              onClick={() =>
                typeof props.backPath === "string" ? router.push(props.backPath as string) : router.back()
              }
              StartIcon="arrow-left"
              aria-label="Go Back"
              className="rounded-md ltr:mr-2 rtl:ml-2"
            />
          )}
          {props.heading && (
            <header
              className={classNames(props.large && "py-8", "flex w-full max-w-full items-center truncate")}>
              {props.HeadingLeftIcon && <div className="ltr:mr-4">{props.HeadingLeftIcon}</div>}
              <div
                className={classNames("w-full truncate ltr:mr-4 rtl:ml-4 md:block", props.headerClassName)}>
                {props.heading && (
                  <h3
                    className={classNames(
                      "font-cal max-w-28 sm:max-w-72 md:max-w-80 text-emphasis inline truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full",
                      props.smallHeading ? "text-base" : "text-xl",
                      props.hideHeadingOnMobile && "hidden"
                    )}>
                    {!isLocaleReady ? <SkeletonText invisible /> : props.heading}
                  </h3>
                )}
                {props.subtitle && (
                  <p className="text-default hidden text-sm md:block" data-testid="subtitle">
                    {!isLocaleReady ? <SkeletonText invisible /> : props.subtitle}
                  </p>
                )}
              </div>
              {props.beforeCTAactions}
              {props.CTA && (
                <div
                  className={classNames(
                    props.backPath
                      ? "relative"
                      : "pwa:bottom-[max(7rem,_calc(5rem_+_env(safe-area-inset-bottom)))] fixed bottom-20 z-40 ltr:right-4 rtl:left-4 md:z-auto md:ltr:right-0 md:rtl:left-0",
                    "flex-shrink-0 [-webkit-app-region:no-drag] md:relative md:bottom-auto md:right-auto"
                  )}>
                  {isLocaleReady && props.CTA}
                </div>
              )}
              {props.actions && props.actions}
            </header>
          )}
        </div>
      )}
      {props.afterHeading && <>{props.afterHeading}</>}
      <div className={classNames(props.flexChildrenContainer && "flex flex-1 flex-col")}>
        {props.children}
      </div>
    </>
  );
}

function MainContainer({
  isPlatformUser,
  MobileNavigationContainer: MobileNavigationContainerProp = (
    <MobileNavigationContainer isPlatformNavigation={isPlatformUser} />
  ),
  TopNavContainer: TopNavContainerProp = <TopNavContainer />,
  ...props
}: LayoutProps) {
  return (
    <main className="bg-default relative z-0 flex-1 focus:outline-none">
      {/* show top navigation for md and smaller (tablet and phones) */}
      {TopNavContainerProp}
      <div className="max-w-full px-2 py-4 lg:px-6">
        <ErrorBoundary>
          {!props.withoutMain ? <ShellMain {...props}>{props.children}</ShellMain> : props.children}
        </ErrorBoundary>
        {/* show bottom navigation for md and smaller (tablet and phones) on pages where back button doesn't exist */}
        {!props.backPath ? MobileNavigationContainerProp : null}
      </div>
    </main>
  );
}

function TopNavContainer() {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return <TopNav />;
}

function TopNav() {
  const isEmbed = useIsEmbed();
  const { t } = useLocale();
  return (
    <>
      <nav
        style={isEmbed ? { display: "none" } : {}}
        className="bg-muted border-subtle sticky top-0 z-40 flex w-full items-center justify-between border-b bg-opacity-50 px-4 py-1.5 backdrop-blur-lg sm:p-4 md:hidden">
        <Link href="/event-types">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 self-center">
          <span className="hover:bg-muted hover:text-emphasis text-default group flex items-center rounded-full text-sm font-medium lg:hidden">
            <KBarTrigger />
          </span>
          <button className="hover:bg-muted hover:text-subtle text-muted rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
            <span className="sr-only">{t("settings")}</span>
            <Link href="/settings/my-account/profile">
              <Icon name="settings" className="text-default h-4 w-4" aria-hidden="true" />
            </Link>
          </button>
          <UserDropdown small />
        </div>
      </nav>
    </>
  );
}

export const MobileNavigationMoreItems = () => {
  const { mobileNavigationMoreItems } = getDesktopNavigationItems();

  return (
    <ul className="border-subtle mt-2 rounded-md border">
      {mobileNavigationMoreItems.map((item) => (
        <MobileNavigationMoreItem key={item.name} item={item} />
      ))}
    </ul>
  );
};

function ProfileDropdown() {
  const { update, data: sessionData } = useSession();
  const { data } = trpc.viewer.me.useQuery();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!data || !ENABLE_PROFILE_SWITCHER || !sessionData) {
    return null;
  }
  const options = data.profiles.map((profile) => {
    let label;
    if (profile.organization) {
      label = profile.organization.name;
    } else {
      label = sessionData.user.name;
    }

    return {
      label,
      value: profile.upId,
    };
  });

  const currentOption = options.find((option) => option.value === sessionData.upId) || options[0];

  return (
    <Dropdown open={menuOpen}>
      <DropdownMenuTrigger asChild onClick={() => setMenuOpen((menuOpen) => !menuOpen)}>
        <button
          data-testid="user-dropdown-trigger-button"
          className={classNames(
            "hover:bg-emphasis todesktop:!bg-transparent group mx-0 flex w-full cursor-pointer appearance-none items-center rounded-full px-2 py-1.5 text-left outline-none transition focus:outline-none focus:ring-0 md:rounded-none lg:rounded"
          )}>
          <span className="flex w-full flex-grow items-center justify-around gap-2 text-sm font-medium leading-none">
            <Avatar alt={currentOption.label || ""} size="xsm" />
            <span className="block w-20 overflow-hidden overflow-ellipsis whitespace-nowrap">
              {currentOption.label}
            </span>
            <Icon
              name="chevron-down"
              className="group-hover:text-subtle text-muted h-4 w-4 flex-shrink-0 rtl:mr-4"
              aria-hidden="true"
            />
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent
          align="start"
          onInteractOutside={() => {
            setMenuOpen(false);
          }}
          className="min-w-56 hariom group overflow-hidden rounded-md">
          <DropdownMenuItem className="p-3 uppercase">
            <span>Switch to</span>
          </DropdownMenuItem>
          {options.map((option) => {
            const isSelected = currentOption.value === option.value;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  setMenuOpen(false);
                  if (isSelected) return;
                  update({
                    upId: option.value,
                  }).then(() => {
                    window.location.reload();
                  });
                }}
                className={classNames("flex w-full", isSelected ? "bg-subtle text-emphasis" : "")}>
                <DropdownItem
                  type="button"
                  childrenClassName={classNames("flex w-full justify-between items-center")}>
                  <span>
                    <Avatar alt={option.label || ""} size="xsm" />
                    <span className="ml-2">{option.label}</span>
                  </span>
                  {isSelected ? (
                    <Icon name="check" className="ml-2 inline h-4 w-4" aria-hidden="true" />
                  ) : null}
                </DropdownItem>
              </DropdownMenuItem>
            );
          })}

          {/* <DropdownMenuSeparator /> */}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
}
