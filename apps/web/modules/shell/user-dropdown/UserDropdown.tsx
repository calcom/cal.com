import { ROADMAP } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useUserAgentData } from "@calcom/lib/hooks/useUserAgentData";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import classNames from "@calcom/ui/classNames";
import { Avatar } from "@calcom/ui/components/avatar";
import { Icon } from "@calcom/ui/components/icon";
import { useGetUserAttributes } from "@calcom/web/components/settings/platform/hooks/useGetUserAttributes";
import FreshChatProvider from "@calcom/web/modules/ee/support/lib/freshchat/FreshChatProvider";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@coss/ui/components/menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";

import {
  AppleIcon,
  ChromeIcon,
  EdgeIcon,
  FirefoxIcon,
  LinuxIcon,
  PlayStoreIcon,
  SafariIcon,
  WindowsIcon,
} from "./DownloadIcons";

declare global {
  interface Window {
    Support?: {
      open: () => void;
      shouldShowTriggerButton: (showTrigger: boolean) => void;
    };
    Beacon?: BeaconFunction;
  }
}

type BeaconFunction = {
  (command: "session-data", data: Record<string, string | number>): void;
  // Catch-all for other methods - add explicit types above if using new commands
  (...args: unknown[]): void;
};

interface UserDropdownProps {
  small?: boolean;
}

const DOWNLOAD_LINKS = {
  ios: "https://go.cal.com/iOS",
  android: "https://go.cal.com/android",
  chrome: "https://go.cal.com/chrome",
  safari: "https://go.cal.com/safari",
  firefox: "https://go.cal.com/firefox",
  edge: "https://go.cal.com/edge",
  macos: "https://cal.com/download",
  windows: "https://cal.com/download",
  linux: "https://cal.com/download",
} as const;

export function UserDropdown({ small }: UserDropdownProps) {
  const { isPlatformUser } = useGetUserAttributes();
  const { t } = useLocale();
  const { data: user, isPending } = useMeQuery();
  const pathname = usePathname();
  const isPlatformPages = pathname?.startsWith("/settings/platform");
  const { os, browser, isMobile } = useUserAgentData();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sendSessionData = () => {
      const Beacon = window.Beacon;
      if (Beacon) {
        Beacon("session-data", {
          username: user?.username || "Unknown",
          screenResolution: `${screen.width}x${screen.height}`,
        });
        return true;
      }
      return false;
    };

    // Try immediately, then poll if Beacon isn't loaded yet
    if (!sendSessionData()) {
      const intervalId = setInterval(() => {
        if (sendSessionData()) {
          clearInterval(intervalId);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [user?.username]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [openSupportAfterClose, setOpenSupportAfterClose] = useState(false);

  const handleHelpClick = (e?: MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    setOpenSupportAfterClose(true);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!menuOpen && openSupportAfterClose) {
      setTimeout(() => {
        window.Support?.open();
      }, 0);
      setOpenSupportAfterClose(false);
    }
  }, [menuOpen, openSupportAfterClose]);

  // Prevent rendering dropdown if user isn't available.
  // We don't want to show nameless user.
  if (!user && !isPending) {
    return null;
  }

  return (
    <Menu open={menuOpen} onOpenChange={setMenuOpen}>
      <MenuTrigger
        disabled={isPending}
        render={
          <button
            data-testid="user-dropdown-trigger-button"
            className={classNames(
              "hover:bg-emphasis todesktop:!bg-transparent group mx-0 flex w-full cursor-pointer appearance-none items-center rounded-full text-left outline-none transition focus:outline-none focus:ring-0 md:rounded-none lg:rounded",
              small ? "p-2" : "px-2 py-1.5"
            )}
          />
        }>
        <span
          className={classNames(
            small ? "h-4 w-4" : "h-5 w-5 ltr:mr-2 rtl:ml-2",
            "relative shrink-0 rounded-full"
          )}>
          <Avatar
            size={small ? "xs" : "xsm"}
            imageSrc={user?.avatarUrl ?? user?.avatar}
            alt={user?.username ? `${user.username} Avatar` : "Nameless User Avatar"}
            className="overflow-hidden"
          />
          <span
            className={classNames(
              "border-muted absolute -bottom-1 -right-1 rounded-full border bg-green-500",
              small ? "-bottom-0.5 -right-0.5 h-2.5 w-2.5" : "-bottom-0.5 right-0 h-2 w-2"
            )}
          />
        </span>
        {!small && (
          <span className="flex grow items-center gap-2">
            <span className="w-24 shrink-0 text-sm leading-none">
              <span className="text-emphasis block truncate py-0.5 font-medium leading-normal">
                {isPending ? "Loading..." : (user?.name ?? "Nameless User")}
              </span>
            </span>
            <Icon
              name={menuOpen ? "chevron-up" : "chevron-down"}
              className="group-hover:text-subtle text-muted h-4 w-4 shrink-0 transition rtl:mr-4"
              aria-hidden="true"
            />
          </span>
        )}
      </MenuTrigger>

      <FreshChatProvider>
        <MenuPopup align="start">
          {!isPlatformPages && (
            <>
              <MenuItem render={<Link href="/settings/my-account/profile" />}>
                <Icon name="user" />
                {t("my_profile")}
              </MenuItem>
              <MenuItem render={<Link href="/settings/my-account/general" />}>
                <Icon name="settings" />
                {t("my_settings")}
              </MenuItem>
              <MenuItem render={<Link href="/settings/my-account/out-of-office" />}>
                <Icon name="moon" />
                {t("out_of_office")}
              </MenuItem>
              <MenuSeparator />
            </>
          )}

          <MenuItem render={<a href={ROADMAP} target="_blank" rel="noreferrer" />}>
            <Icon name="map" />
            {t("visit_roadmap")}
          </MenuItem>
          <MenuItem onClick={handleHelpClick}>
            <Icon name="circle-help" />
            {t("help")}
          </MenuItem>
          {!isPlatformPages && isMobile && os === "ios" && (
            <MenuItem render={<a href={DOWNLOAD_LINKS.ios} target="_blank" rel="noreferrer" />}>
              <Icon name="download" />
              {t("download_app")}
            </MenuItem>
          )}
          {!isPlatformPages && isMobile && os === "android" && (
            <MenuItem render={<a href={DOWNLOAD_LINKS.android} target="_blank" rel="noreferrer" />}>
              <Icon name="download" />
              {t("download_app")}
            </MenuItem>
          )}
          {!isPlatformPages && !isMobile && (
            <MenuSub>
              <MenuSubTrigger>
                <Icon name="download" />
                {t("download_app")}
              </MenuSubTrigger>
              <MenuSubPopup>
                {os === "macos" && (
                  <MenuItem render={<a href={DOWNLOAD_LINKS.macos} target="_blank" rel="noreferrer" />}>
                    <AppleIcon className="size-4 fill-foreground" />
                    {t("download_for_macos")}
                  </MenuItem>
                )}
                {os === "windows" && (
                  <MenuItem render={<a href={DOWNLOAD_LINKS.windows} target="_blank" rel="noreferrer" />}>
                    <WindowsIcon className="size-4" />
                    {t("download_for_windows")}
                  </MenuItem>
                )}
                {os === "linux" && (
                  <MenuItem render={<a href={DOWNLOAD_LINKS.linux} target="_blank" rel="noreferrer" />}>
                    <LinuxIcon className="size-4" />
                    {t("download_for_linux")}
                  </MenuItem>
                )}
                {browser === "chrome" && (
                  <MenuItem render={<a href={DOWNLOAD_LINKS.chrome} target="_blank" rel="noreferrer" />}>
                    <ChromeIcon className="size-4" />
                    {t("download_chrome_extension")}
                  </MenuItem>
                )}
                {browser === "safari" && (
                  <MenuItem render={<a href={DOWNLOAD_LINKS.safari} target="_blank" rel="noreferrer" />}>
                    <SafariIcon className="size-4" />
                    {t("download_safari_extension")}
                  </MenuItem>
                )}
                {browser === "firefox" && (
                  <MenuItem render={<a href={DOWNLOAD_LINKS.firefox} target="_blank" rel="noreferrer" />}>
                    <FirefoxIcon className="size-4" />
                    {t("download_firefox_extension")}
                  </MenuItem>
                )}
                {browser === "edge" && (
                  <MenuItem render={<a href={DOWNLOAD_LINKS.edge} target="_blank" rel="noreferrer" />}>
                    <EdgeIcon className="size-4" />
                    {t("download_edge_extension")}
                  </MenuItem>
                )}
                <MenuItem render={<a href={DOWNLOAD_LINKS.ios} target="_blank" rel="noreferrer" />}>
                  <AppleIcon className="size-4 fill-foreground" />
                  {t("download_for_ios")}
                </MenuItem>
                <MenuItem render={<a href={DOWNLOAD_LINKS.android} target="_blank" rel="noreferrer" />}>
                  <PlayStoreIcon className="size-4" />
                  {t("download_for_android")}
                </MenuItem>
              </MenuSubPopup>
            </MenuSub>
          )}

          {!isPlatformPages && isPlatformUser && (
            <MenuItem render={<Link href="/settings/platform" />} className="todesktop:hidden hidden lg:flex">
              <Icon name="blocks" />
              {t("platform")}
            </MenuItem>
          )}
          <MenuSeparator />

          <MenuItem
            variant="destructive"
            onClick={() => {
              signOut({ callbackUrl: "/auth/logout" });
            }}>
            <Icon name="log-out" />
            {t("sign_out")}
          </MenuItem>
        </MenuPopup>
      </FreshChatProvider>
    </Menu>
  );
}
