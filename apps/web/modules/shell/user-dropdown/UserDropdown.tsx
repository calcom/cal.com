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
  const { os, browser } = useUserAgentData();

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
              name="chevron-down"
              className="group-hover:text-subtle text-muted h-4 w-4 shrink-0 transition rtl:mr-4"
              aria-hidden="true"
            />
          </span>
        )}
      </MenuTrigger>

      <FreshChatProvider>
        <MenuPopup align="start" className="group w-[220px] overflow-hidden rounded-md">
          {!isPlatformPages && (
            <>
              <MenuItem
                render={<Link href="/settings/my-account/profile" />}
                className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                <Icon name="user" className="text-default h-4 w-4" aria-hidden="true" />
                {t("my_profile")}
              </MenuItem>
              <MenuItem
                render={<Link href="/settings/my-account/general" />}
                className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                <Icon name="settings" className="text-default h-4 w-4" aria-hidden="true" />
                {t("my_settings")}
              </MenuItem>
              <MenuItem
                render={<Link href="/settings/my-account/out-of-office" />}
                className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                <Icon name="moon" className="text-default h-4 w-4" aria-hidden="true" />
                {t("out_of_office")}
              </MenuItem>
              <MenuSeparator />
            </>
          )}

          <MenuItem
            render={<a href={ROADMAP} target="_blank" rel="noreferrer" />}
            className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
            <Icon name="map" className="h-4 w-4" />
            {t("visit_roadmap")}
          </MenuItem>
          <MenuItem
            onClick={handleHelpClick}
            className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
            <Icon name="circle-help" className="h-4 w-4" aria-hidden="true" />
            {t("help")}
          </MenuItem>
          {!isPlatformPages && (
            <MenuSub>
              <MenuSubTrigger className="todesktop:hidden hidden lg:flex">
                <Icon name="download" className="h-4 w-4" />
                {t("download_app")}
              </MenuSubTrigger>
              <MenuSubPopup>
                <MenuItem
                  render={<a href={DOWNLOAD_LINKS.ios} target="_blank" rel="noreferrer" />}
                  className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 fill-foreground"
                    aria-hidden="true">
                    <path d="M17.369 14.288C17.1012 14.9106 16.7709 15.5043 16.383 16.06C15.865 16.7987 15.4417 17.31 15.113 17.594C14.6063 18.0593 14.0627 18.299 13.482 18.313C13.064 18.313 12.5613 18.193 11.974 17.953C11.3867 17.713 10.8457 17.5933 10.351 17.594C9.833 17.594 9.277 17.7137 8.683 17.953C8.08767 18.193 7.607 18.3193 7.241 18.332C6.683 18.356 6.12667 18.11 5.572 17.594C5.218 17.2853 4.77533 16.7557 4.244 16.005C3.674 15.205 3.206 14.275 2.84 13.215C2.44667 12.0723 2.25 10.9643 2.25 9.891C2.25 8.66233 2.51567 7.60367 3.047 6.715C3.44974 6.01794 4.02478 5.43601 4.717 5.025C5.39991 4.61726 6.17868 4.39781 6.974 4.389C7.41667 4.38967 7.99867 4.525 8.72 4.795C9.44067 5.06633 9.90233 5.20233 10.105 5.203C10.2577 5.203 10.7697 5.043 11.641 4.723C12.4637 4.427 13.1593 4.30367 13.728 4.353C15.272 4.47633 16.4293 5.08533 17.2 6.18C15.82 7.01667 15.1373 8.18633 15.152 9.689C15.1653 10.8597 15.5887 11.8317 16.422 12.605C16.8 12.963 17.2233 13.2407 17.692 13.438C17.5907 13.7327 17.483 14.016 17.369 14.288ZM13.83 0.367C13.83 1.28433 13.496 2.13933 12.828 2.932C12.022 3.874 11.048 4.419 9.991 4.332C9.97696 4.21686 9.96962 4.10099 9.969 3.985C9.969 3.105 10.352 2.163 11.033 1.393C11.373 1.003 11.805 0.678667 12.329 0.42C12.8517 0.164667 13.3457 0.0246667 13.811 0C13.8243 0.122667 13.831 0.245 13.831 0.367" />
                  </svg>
                  {t("download_for_ios")}
                </MenuItem>
                <MenuItem
                  render={<a href={DOWNLOAD_LINKS.android} target="_blank" rel="noreferrer" />}
                  className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                  <img src="/icons/download/play-store.svg" alt="" className="h-4 w-4" />
                  {t("download_for_android")}
                </MenuItem>
                {browser === "chrome" && (
                  <MenuItem
                    render={<a href={DOWNLOAD_LINKS.chrome} target="_blank" rel="noreferrer" />}
                    className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                    <img src="/icons/download/chrome.svg" alt="" className="h-4 w-4" />
                    {t("download_chrome_extension")}
                  </MenuItem>
                )}
                {browser === "safari" && (
                  <MenuItem
                    render={<a href={DOWNLOAD_LINKS.safari} target="_blank" rel="noreferrer" />}
                    className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                    <img src="/icons/download/safari.svg" alt="" className="h-4 w-4" />
                    {t("download_safari_extension")}
                  </MenuItem>
                )}
                {browser === "firefox" && (
                  <MenuItem
                    render={<a href={DOWNLOAD_LINKS.firefox} target="_blank" rel="noreferrer" />}
                    className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                    <img src="/icons/download/firefox.svg" alt="" className="h-4 w-4" />
                    {t("download_firefox_extension")}
                  </MenuItem>
                )}
                {browser === "edge" && (
                  <MenuItem
                    render={<a href={DOWNLOAD_LINKS.edge} target="_blank" rel="noreferrer" />}
                    className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                    <img src="/icons/download/edge.svg" alt="" className="h-4 w-4" />
                    {t("download_edge_extension")}
                  </MenuItem>
                )}
                {os === "macos" && (
                  <MenuItem
                    render={<a href={DOWNLOAD_LINKS.macos} target="_blank" rel="noreferrer" />}
                    className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 fill-foreground"
                      aria-hidden="true">
                      <path d="M17.369 14.288C17.1012 14.9106 16.7709 15.5043 16.383 16.06C15.865 16.7987 15.4417 17.31 15.113 17.594C14.6063 18.0593 14.0627 18.299 13.482 18.313C13.064 18.313 12.5613 18.193 11.974 17.953C11.3867 17.713 10.8457 17.5933 10.351 17.594C9.833 17.594 9.277 17.7137 8.683 17.953C8.08767 18.193 7.607 18.3193 7.241 18.332C6.683 18.356 6.12667 18.11 5.572 17.594C5.218 17.2853 4.77533 16.7557 4.244 16.005C3.674 15.205 3.206 14.275 2.84 13.215C2.44667 12.0723 2.25 10.9643 2.25 9.891C2.25 8.66233 2.51567 7.60367 3.047 6.715C3.44974 6.01794 4.02478 5.43601 4.717 5.025C5.39991 4.61726 6.17868 4.39781 6.974 4.389C7.41667 4.38967 7.99867 4.525 8.72 4.795C9.44067 5.06633 9.90233 5.20233 10.105 5.203C10.2577 5.203 10.7697 5.043 11.641 4.723C12.4637 4.427 13.1593 4.30367 13.728 4.353C15.272 4.47633 16.4293 5.08533 17.2 6.18C15.82 7.01667 15.1373 8.18633 15.152 9.689C15.1653 10.8597 15.5887 11.8317 16.422 12.605C16.8 12.963 17.2233 13.2407 17.692 13.438C17.5907 13.7327 17.483 14.016 17.369 14.288ZM13.83 0.367C13.83 1.28433 13.496 2.13933 12.828 2.932C12.022 3.874 11.048 4.419 9.991 4.332C9.97696 4.21686 9.96962 4.10099 9.969 3.985C9.969 3.105 10.352 2.163 11.033 1.393C11.373 1.003 11.805 0.678667 12.329 0.42C12.8517 0.164667 13.3457 0.0246667 13.811 0C13.8243 0.122667 13.831 0.245 13.831 0.367" />
                    </svg>
                    {t("download_for_macos")}
                  </MenuItem>
                )}
                {os === "windows" && (
                  <MenuItem
                    render={<a href={DOWNLOAD_LINKS.windows} target="_blank" rel="noreferrer" />}
                    className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                    <img src="/icons/download/windows.svg" alt="" className="h-4 w-4" />
                    {t("download_for_windows")}
                  </MenuItem>
                )}
                {os === "linux" && (
                  <MenuItem
                    render={<a href={DOWNLOAD_LINKS.linux} target="_blank" rel="noreferrer" />}
                    className="hover:bg-subtle hover:text-emphasis text-default flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium">
                    <img src="/icons/download/linux.svg" alt="" className="h-4 w-4" />
                    {t("download_for_linux")}
                  </MenuItem>
                )}
              </MenuSubPopup>
            </MenuSub>
          )}

          {!isPlatformPages && isPlatformUser && (
            <MenuItem
              render={<Link href="/settings/platform" />}
              className="todesktop:hidden hover:bg-subtle hover:text-emphasis text-default hidden w-full items-center gap-2 rounded-lg p-2 text-sm font-medium lg:flex">
              <Icon name="blocks" className="h-4 w-4" />
              Platform
            </MenuItem>
          )}
          <MenuSeparator />

          <MenuItem
            onClick={() => {
              signOut({ callbackUrl: "/auth/logout" });
            }}
            className="hover:bg-error hover:text-error text-error flex w-full items-center gap-2 rounded-lg p-2 text-sm font-medium"
            aria-hidden="true">
            <Icon name="log-out" className="h-4 w-4" />
            {t("sign_out")}
          </MenuItem>
        </MenuPopup>
      </FreshChatProvider>
    </Menu>
  );
}
