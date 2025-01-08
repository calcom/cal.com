import type { User as UserAuth } from "next-auth";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { classNames } from "@calcom/lib";
import { IS_CALCOM, IS_VISUAL_REGRESSION_TESTING, ENABLE_PROFILE_SWITCHER } from "@calcom/lib/constants";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { getBookerBaseUrlSync } from "@calcom/lib/getBookerUrl/client";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar, ButtonOrLink, Credits, Icon, SkeletonText, Tooltip, Logo, showToast } from "@calcom/ui";

import { KBarTrigger } from "../kbar/Kbar";
import { Navigation } from "./navigation/Navigation";
import { type NavigationItemType } from "./navigation/NavigationItem";
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

  // Make sure that Sidebar is rendered optimistically so that a refresh of pages when logged in have SideBar from the beginning.
  // This improves the experience of refresh on app store pages(when logged in) which are SSG.
  // Though when logged out, app store pages would temporarily show SideBar until session status is confirmed.
  if (status !== "loading" && status !== "authenticated") return null;
  return <SideBar isPlatformUser={isPlatformUser} bannersHeight={bannersHeight} user={data?.user} />;
}

export function SideBar({ bannersHeight, user }: SideBarProps) {
  const { fetchAndCopyToClipboard } = useCopy();
  const { t, isLocaleReady } = useLocale();
  const pathname = usePathname();
  const isPlatformPages = pathname?.startsWith("/settings/platform");
  const [isReferalLoading, setIsReferalLoading] = useState(false);

  const publicPageUrl = `${getBookerBaseUrlSync(user?.org?.slug ?? null)}/${user?.username}`;

  const sidebarStylingAttributes = {
    maxHeight: `calc(100vh - ${bannersHeight}px)`,
    top: `${bannersHeight}px`,
  };

  // Todo: extract this to a hook
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
    IS_CALCOM
      ? {
          name: "copy_referral_link",
          href: "",
          onClick: (e: { preventDefault: () => void }) => {
            e.preventDefault();
            setIsReferalLoading(true);
            // Create an artificial delay to show the loading state so it doesnt flicker if this request is fast
            setTimeout(() => {
              fetchAndCopyToClipboard(
                fetch("/api/generate-referral-link", {
                  method: "POST",
                })
                  .then((res) => res.json())
                  .then((res) => res.shortLink),
                {
                  onSuccess: () => showToast(t("link_copied"), "success"),
                  onFailure: () => showToast("Copy to clipboard failed", "error"),
                }
              );
              setIsReferalLoading(false);
            }, 1000);
          },
          icon: "gift",
          isLoading: isReferalLoading,
        }
      : null,
    {
      name: "settings",
      href: user?.org ? `/settings/organizations/profile` : "/settings/my-account/profile",
      icon: "settings",
    },
  ].filter(Boolean) as NavigationItemType[];

  return (
    <div className="relative">
      <aside
        style={!isPlatformPages ? sidebarStylingAttributes : {}}
        className={classNames(
          "bg-muted border-muted fixed left-0 hidden h-full w-14 flex-col overflow-y-auto overflow-x-hidden border-r md:sticky md:flex lg:w-56 lg:px-3",
          !isPlatformPages && "max-h-screen"
        )}>
        <div className="flex h-full flex-col justify-between py-3 lg:pt-4">
          <header className="taurify:-mt-3 taurify:flex-col-reverse items-center justify-between md:hidden lg:flex">
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
              <div data-testid="user-dropdown-trigger" className="taurify:mt-4 w-full">
                <span className="hidden lg:inline">
                  <UserDropdown />
                </span>
                <span className="hidden md:inline lg:hidden">
                  <UserDropdown small />
                </span>
              </div>
            )}
            <div className="flex w-full justify-end rtl:space-x-reverse" data-tauri-drag-region>
              <button
                color="minimal"
                onClick={() => window.history.back()}
                className="taurify:block hover:text-emphasis text-subtle group hidden text-sm font-medium">
                <Icon
                  name="arrow-left"
                  className="group-hover:text-emphasis text-subtle h-4 w-4 flex-shrink-0"
                />
              </button>
              <button
                color="minimal"
                onClick={() => window.history.forward()}
                className="taurify:block hover:text-emphasis text-subtle group hidden text-sm font-medium">
                <Icon
                  name="arrow-right"
                  className="group-hover:text-emphasis text-subtle h-4 w-4 flex-shrink-0"
                />
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
                      name={item.isLoading ? "rotate-cw" : item.icon}
                      className={classNames(
                        "h-4 w-4 flex-shrink-0 [&[aria-current='page']]:text-inherit",
                        "me-3 md:mx-auto lg:ltr:mr-2 lg:rtl:ml-2",
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
        )}
      </aside>
    </div>
  );
}
