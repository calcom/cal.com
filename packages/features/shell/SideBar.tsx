import type { User as UserAuth } from "next-auth";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { IS_VISUAL_REGRESSION_TESTING, ENABLE_PROFILE_SWITCHER } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UserPermissionRole } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Credits } from "@calcom/ui/components/credits";
import { ButtonOrLink } from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { KBarTrigger } from "../kbar/Kbar";
import { Navigation } from "./navigation/Navigation";
import { useBottomNavItems } from "./useBottomNavItems";
import { ProfileDropdown } from "./user-dropdown/ProfileDropdown";
import { UserDropdown } from "./user-dropdown/UserDropdown";

// need to import without ssr to prevent hydration errors
const Tips = dynamic(() => import("@calcom/features/tips").then((mod) => mod.Tips), {
  ssr: false,
});

export type SideBarContainerProps = {
  bannersHeight: number;
  isPlatformUser?: boolean;
};

export type SideBarProps = {
  bannersHeight: number;
  user?: UserAuth | null;
  isPlatformUser?: boolean;
};

export function SideBarContainer({ bannersHeight, isPlatformUser = false }: SideBarContainerProps) {
  const { status, data } = useSession();

  // Render nothing once we know the user isn't authenticated.
  if (status !== "loading" && status !== "authenticated") return null;
  return <SideBar isPlatformUser={isPlatformUser} bannersHeight={bannersHeight} user={data?.user} />;
}

// Build a safe absolute public page URL, or empty string if we can't.
const buildPublicPageUrl = (user?: UserAuth | null): string => {
  const base =
    getBookerBaseUrlSync(user?.org?.slug ?? null) ||
    process.env.NEXT_PUBLIC_WEBAPP_URL ||
    process.env.NEXTAUTH_URL ||
    "";
  const username = user?.orgAwareUsername;
  if (!base || !username) return "";
  return `${String(base).replace(/\/+$/, "")}/${username}`;
};

export function SideBar({ bannersHeight, user }: SideBarProps) {
  const session = useSession();
  const { t, isLocaleReady } = useLocale();
  const pathname = usePathname();
  const isPlatformPages = pathname?.startsWith("/settings/platform");
  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;

  const publicPageUrl = buildPublicPageUrl(user);

  const bottomNavItems = useBottomNavItems({
    publicPageUrl,
    isAdmin,
    user,
  });

  const sidebarStylingAttributes = {
    maxHeight: `calc(100vh - ${bannersHeight}px)`,
    top: `${bannersHeight}px`,
  };

  return (
    <div className="relative">
      <aside
        style={!isPlatformPages ? sidebarStylingAttributes : {}}
        className={classNames(
          "bg-cal-muted border-muted fixed left-0 hidden h-full w-14 flex-col overflow-y-auto overflow-x-hidden border-r md:sticky md:flex lg:w-56 lg:px-3",
          !isPlatformPages && "max-h-screen"
        )}>
        <div className="flex h-full flex-col justify-between py-3 lg:pt-4">
          <header className="todesktop:-mt-3 todesktop:flex-col-reverse todesktop:[-webkit-app-region:drag] items-center justify-between md:hidden lg:flex">
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
                className="todesktop:block hover:text-emphasis text-subtle group hidden text-sm font-medium">
                <Icon name="arrow-left" className="group-hover:text-emphasis text-subtle h-4 w-4 shrink-0" />
              </button>
              <button
                color="minimal"
                onClick={() => window.history.forward()}
                className="todesktop:block hover:text-emphasis text-subtle group hidden text-sm font-medium">
                <Icon name="arrow-right" className="group-hover:text-emphasis text-subtle h-4 w-4 shrink-0" />
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

          <Navigation isPlatformNavigation={isPlatformPages} />
        </div>

        {!isPlatformPages && (
          <div>
            <div className="overflow-hidden">
              <Tips />
            </div>

            {bottomNavItems.map((item, index) => {
              const isActionOnly = !item.href;
              const isInternal = !!item.href && item.href.startsWith("/");

              const content = (
                <>
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
                </>
              );

              const commonClassName = classNames(
                "text-left",
                "[&[aria-current='page']]:bg-emphasis text-default justify-right group flex items-center rounded-md px-2 py-1.5 text-sm font-medium transition",
                "[&[aria-current='page']]:text-emphasis mt-0.5 w-full text-sm",
                isLocaleReady ? "hover:bg-emphasis hover:text-emphasis" : "",
                index === 0 && "mt-3"
              );

              return (
                <Tooltip side="right" content={t(item.name)} className="lg:hidden" key={item.name}>
                  {isActionOnly ? (
                    <button
                      id={item.name}
                      type="button"
                      onClick={item.onClick}
                      className={commonClassName}
                      aria-label={t(item.name)}
                      disabled={item.isLoading}>
                      {content}
                    </button>
                  ) : isInternal ? (
                    <Link
                      href={item.href!}
                      className={commonClassName}
                      aria-label={t(item.name)}
                      onClick={item.onClick}>
                      {content}
                    </Link>
                  ) : (
                    <ButtonOrLink
                      id={item.name}
                      href={item.href!} // external/absolute only
                      target={item.target === "__blank" ? "_blank" : item.target}
                      onClick={item.onClick}
                      className={commonClassName}
                      aria-label={t(item.name)}>
                      {content}
                    </ButtonOrLink>
                  )}
                </Tooltip>
              );
            })}

            {!IS_VISUAL_REGRESSION_TESTING && <Credits />}
          </div>
        )}
      </aside>
    </div>
  );
}
