import { ENABLE_PROFILE_SWITCHER, IS_VISUAL_REGRESSION_TESTING, WEBAPP_URL } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useIsStandalone } from "@calcom/lib/hooks/useIsStandalone";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Credits } from "@calcom/ui/components/credits";
import { ButtonOrLink } from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { ArrowLeftIcon, ArrowRightIcon } from "@coss/ui/icons";
import Link from "next/link";
import type { User as UserAuth } from "next-auth";
import { useSession } from "next-auth/react";
import { KBarTrigger } from "./Kbar";
import { Navigation } from "./navigation/Navigation";
import { useBottomNavItems } from "./useBottomNavItems";
import { ProfileDropdown } from "./user-dropdown/ProfileDropdown";
import { UserDropdown } from "./user-dropdown/UserDropdown";

export type SideBarContainerProps = {
  bannersHeight: number;
};

export type SideBarProps = {
  bannersHeight: number;
  user?: UserAuth | null;
};

export function SideBarContainer({ bannersHeight }: SideBarContainerProps) {
  const { status, data } = useSession();
  const isStandalone = useIsStandalone();

  // Make sure that Sidebar is rendered optimistically so that a refresh of pages when logged in have SideBar from the beginning.
  // This improves the experience of refresh on app store pages(when logged in) which are SSG.
  // Though when logged out, app store pages would temporarily show SideBar until session status is confirmed.
  if (status !== "loading" && status !== "authenticated") return null;
  if (isStandalone) return null;
  return <SideBar bannersHeight={bannersHeight} user={data?.user} />;
}

export function SideBar({ bannersHeight, user }: SideBarProps) {
  const { t, isLocaleReady } = useLocale();

  const publicPageUrl = `${WEBAPP_URL}/${user?.orgAwareUsername}`;

  const bottomNavItems = useBottomNavItems({
    publicPageUrl,
  });

  const sidebarStylingAttributes = {
    maxHeight: `calc(100vh - ${bannersHeight}px)`,
    top: `${bannersHeight}px`,
  };

  return (
    <div className="relative">
      <aside
        style={sidebarStylingAttributes}
        className={classNames(
          "fixed left-0 hidden h-full w-14 flex-col overflow-y-auto overflow-x-hidden border-muted border-r bg-cal-muted md:sticky md:flex lg:w-56 lg:px-3",
          "max-h-screen"
        )}>
        <div className="flex h-full flex-col justify-between py-3 lg:pt-4">
          <header className="todesktop:-mt-3 todesktop:flex-col-reverse items-center justify-between todesktop:[-webkit-app-region:drag] md:hidden lg:flex">
            {user?.org ? (
              !ENABLE_PROFILE_SWITCHER ? (
                <Link href="/settings/organizations/profile" className="w-full px-1.5">
                  <div className="flex items-center gap-2 font-medium">
                    <Avatar
                      alt={`${user.org.name} logo`}
                      imageSrc={getPlaceholderAvatar(user.org.logoUrl, user.org.name)}
                      size="xsm"
                    />
                    <p className="text line-clamp-1 text-sm">
                      <span>{user.org.name}</span>
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
            <div className="flex w-full justify-end rtl:space-x-reverse">
              <button
                color="minimal"
                onClick={() => window.history.back()}
                className="group todesktop:block hidden font-medium text-sm text-subtle hover:text-emphasis">
                <ArrowLeftIcon className="h-4 w-4 shrink-0 text-subtle group-hover:text-emphasis" />
              </button>
              <button
                color="minimal"
                onClick={() => window.history.forward()}
                className="group todesktop:block hidden font-medium text-sm text-subtle hover:text-emphasis">
                <ArrowRightIcon className="h-4 w-4 shrink-0 text-subtle group-hover:text-emphasis" />
              </button>
              {!!user?.org && (
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
          <Navigation />
        </div>

        <div className="md:px-2 md:pb-4 lg:p-0">
          {bottomNavItems.map((item, index) => (
            <Tooltip side="right" content={t(item.name)} className="lg:hidden" key={item.name}>
              <ButtonOrLink
                id={item.name}
                href={item.href || undefined}
                aria-label={t(item.name)}
                target={item.target}
                className={classNames(
                  "text-left",
                  "justify-right group flex items-center rounded-md px-2 py-1.5 font-medium text-default text-sm transition [&[aria-current='page']]:bg-emphasis",
                  "mt-0.5 w-full text-sm [&[aria-current='page']]:text-emphasis",
                  isLocaleReady ? "hover:bg-subtle hover:text-emphasis" : "",
                  index === 0 && "mt-3"
                )}
                onClick={item.onClick}>
                {!!item.icon && (
                  <Icon
                    name={item.isLoading ? "rotate-cw" : item.icon}
                    className={classNames(
                      "h-4 w-4 shrink-0 aria-[aria-current='page']:text-inherit",
                      "ml-3 md:mx-auto lg:ltr:mr-2 lg:rtl:ml-2",
                      item.isLoading && "animate-spin"
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
      </aside>
    </div>
  );
}
