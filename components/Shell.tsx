import { SelectorIcon } from "@heroicons/react/outline";
import {
  CalendarIcon,
  ArrowLeftIcon,
  ClockIcon,
  CogIcon,
  ExternalLinkIcon,
  LinkIcon,
  LogoutIcon,
  PuzzleIcon,
  MoonIcon,
} from "@heroicons/react/solid";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { ReactNode, useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

import LicenseBanner from "@ee/components/LicenseBanner";
import TrialBanner from "@ee/components/TrialBanner";
import HelpMenuItemDynamic from "@ee/lib/intercom/HelpMenuItemDynamic";

import classNames from "@lib/classNames";
import { shouldShowOnboarding } from "@lib/getting-started";
import { useLocale } from "@lib/hooks/useLocale";
import { collectPageParameters, telemetryEventTypes, useTelemetry } from "@lib/telemetry";
import { trpc } from "@lib/trpc";

import CustomBranding from "@components/CustomBranding";
import Loader from "@components/Loader";
import { HeadSeo } from "@components/seo/head-seo";
import Avatar from "@components/ui/Avatar";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@components/ui/Dropdown";

import { useViewerI18n } from "./I18nLanguageHandler";
import Logo from "./Logo";
import Button from "./ui/Button";

export function useMeQuery() {
  const meQuery = trpc.useQuery(["viewer.me"], {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return meQuery;
}

function useRedirectToLoginIfUnauthenticated() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace({
        pathname: "/auth/login",
        query: {
          callbackUrl: `${location.pathname}${location.search}`,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  return {
    loading: loading && !session,
  };
}

function useRedirectToOnboardingIfNeeded() {
  const router = useRouter();
  const query = useMeQuery();
  const user = query.data;

  const [isRedirectingToOnboarding, setRedirecting] = useState(false);
  useEffect(() => {
    if (user && shouldShowOnboarding(user)) {
      setRedirecting(true);
    }
  }, [router, user]);
  useEffect(() => {
    if (isRedirectingToOnboarding) {
      router.replace({
        pathname: "/getting-started",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRedirectingToOnboarding]);
  return {
    isRedirectingToOnboarding,
  };
}

export function ShellSubHeading(props: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={classNames("block sm:flex justify-between mb-3", props.className)}>
      <div>
        <h2 className="flex items-center content-center space-x-2 text-base font-bold leading-6 text-gray-900">
          {props.title}
        </h2>
        {props.subtitle && <p className="mr-4 text-sm text-neutral-500">{props.subtitle}</p>}
      </div>
      {props.actions && <div className="flex-shrink-0">{props.actions}</div>}
    </div>
  );
}

export default function Shell(props: {
  centered?: boolean;
  title?: string;
  heading: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  CTA?: ReactNode;
  HeadingLeftIcon?: ReactNode;
  backPath?: string; // renders back button to specified path
  // use when content needs to expand with flex
  flexChildrenContainer?: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const { loading } = useRedirectToLoginIfUnauthenticated();
  const { isRedirectingToOnboarding } = useRedirectToOnboardingIfNeeded();

  const telemetry = useTelemetry();

  const navigation = [
    {
      name: t("event_types_page_title"),
      href: "/event-types",
      icon: LinkIcon,
      current: router.asPath.startsWith("/event-types"),
    },
    {
      name: t("bookings"),
      href: "/bookings/upcoming",
      icon: CalendarIcon,
      current: router.asPath.startsWith("/bookings"),
    },
    {
      name: t("availability"),
      href: "/availability",
      icon: ClockIcon,
      current: router.asPath.startsWith("/availability"),
    },
    {
      name: t("integrations"),
      href: "/integrations",
      icon: PuzzleIcon,
      current: router.asPath.startsWith("/integrations"),
    },
    {
      name: t("settings"),
      href: "/settings/profile",
      icon: CogIcon,
      current: router.asPath.startsWith("/settings"),
    },
  ];

  useEffect(() => {
    telemetry.withJitsu((jitsu) => {
      return jitsu.track(telemetryEventTypes.pageView, collectPageParameters(router.asPath));
    });
  }, [telemetry, router.asPath]);

  const pageTitle = typeof props.heading === "string" ? props.heading : props.title;

  const query = useMeQuery();
  const user = query.data;

  const i18n = useViewerI18n();

  if (i18n.status === "loading" || isRedirectingToOnboarding || loading) {
    // show spinner whilst i18n is loading to avoid language flicker
    return (
      <div className="absolute z-50 flex items-center w-full h-screen bg-gray-50">
        <Loader />
      </div>
    );
  }
  return (
    <>
      <CustomBranding val={user?.brandColor} />
      <HeadSeo
        title={pageTitle ?? "Cal.com"}
        description={props.subtitle ? props.subtitle?.toString() : ""}
        nextSeoProps={{
          nofollow: true,
          noindex: true,
        }}
      />
      <div>
        <Toaster position="bottom-right" />
      </div>

      <div className="flex h-screen overflow-hidden bg-gray-100" data-testid="dashboard-shell">
        <div className="hidden md:flex lg:flex-shrink-0">
          <div className="flex flex-col w-14 lg:w-56">
            <div className="flex flex-col flex-1 h-0 bg-white border-r border-gray-200">
              <div className="flex flex-col flex-1 pt-3 pb-4 overflow-y-auto lg:pt-5">
                <Link href="/event-types">
                  <a className="px-4 md:hidden lg:inline">
                    <Logo small />
                  </a>
                </Link>
                {/* logo icon for tablet */}
                <Link href="/event-types">
                  <a className="md:inline lg:hidden">
                    <Logo small icon />
                  </a>
                </Link>
                <nav className="flex-1 px-2 mt-2 space-y-1 bg-white lg:mt-5">
                  {navigation.map((item) => (
                    <Link key={item.name} href={item.href}>
                      <a
                        className={classNames(
                          item.current
                            ? "bg-neutral-100 text-neutral-900"
                            : "text-neutral-500 hover:bg-gray-50 hover:text-neutral-900",
                          "group flex items-center px-2 py-2 text-sm font-medium rounded-sm"
                        )}>
                        <item.icon
                          className={classNames(
                            item.current
                              ? "text-neutral-500"
                              : "text-neutral-400 group-hover:text-neutral-500",
                            "mr-3 flex-shrink-0 h-5 w-5"
                          )}
                          aria-hidden="true"
                        />
                        <span className="hidden lg:inline">{item.name}</span>
                      </a>
                    </Link>
                  ))}
                </nav>
              </div>
              <TrialBanner />
              <div className="p-2 pt-2 pr-2 m-2 rounded-sm hover:bg-gray-100">
                <span className="hidden lg:inline">
                  <UserDropdown />
                </span>
                <span className="hidden md:inline lg:hidden">
                  <UserDropdown small />
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 w-0 overflow-hidden">
          <main
            className={classNames(
              "flex-1 relative z-0 overflow-y-auto focus:outline-none max-w-[1700px]",
              props.flexChildrenContainer && "flex flex-col"
            )}>
            {/* show top navigation for md and smaller (tablet and phones) */}
            <nav className="flex items-center justify-between p-4 bg-white border-b border-gray-200 md:hidden">
              <Link href="/event-types">
                <a>
                  <Logo />
                </a>
              </Link>
              <div className="flex items-center self-center gap-3">
                <button className="p-2 text-gray-400 bg-white rounded-full hover:text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black">
                  <span className="sr-only">{t("view_notifications")}</span>
                  <Link href="/settings/profile">
                    <a>
                      <CogIcon className="w-6 h-6" aria-hidden="true" />
                    </a>
                  </Link>
                </button>
                <UserDropdown small />
              </div>
            </nav>
            <div
              className={classNames(
                props.centered && "md:max-w-5xl mx-auto",
                props.flexChildrenContainer && "flex flex-col flex-1",
                "py-8"
              )}>
              {!!props.backPath && (
                <div className="mx-3 mb-8 sm:mx-8">
                  <Button
                    onClick={() => router.push(props.backPath as string)}
                    StartIcon={ArrowLeftIcon}
                    color="secondary">
                    Back
                  </Button>
                </div>
              )}
              <div className="block sm:flex justify-between px-4 sm:px-6 md:px-8 min-h-[80px]">
                {props.HeadingLeftIcon && <div className="mr-4">{props.HeadingLeftIcon}</div>}
                <div className="w-full mb-8">
                  <h1 className="mb-1 text-xl font-bold tracking-wide text-gray-900 font-cal">
                    {props.heading}
                  </h1>
                  <p className="mr-4 text-sm text-neutral-500">{props.subtitle}</p>
                </div>
                <div className="flex-shrink-0 mb-4">{props.CTA}</div>
              </div>
              <div
                className={classNames(
                  "px-4 sm:px-6 md:px-8",
                  props.flexChildrenContainer && "flex flex-col flex-1"
                )}>
                {props.children}
              </div>
              {/* show bottom navigation for md and smaller (tablet and phones) */}
              <nav className="fixed bottom-0 flex w-full bg-white shadow bottom-nav md:hidden">
                {/* note(PeerRich): using flatMap instead of map to remove settings from bottom nav */}
                {navigation.flatMap((item, itemIdx) =>
                  item.href === "/settings/profile" ? (
                    []
                  ) : (
                    <Link key={item.name} href={item.href}>
                      <a
                        className={classNames(
                          item.current ? "text-gray-900" : "text-neutral-400 hover:text-gray-700",
                          itemIdx === 0 ? "rounded-l-lg" : "",
                          itemIdx === navigation.length - 1 ? "rounded-r-lg" : "",
                          "group relative min-w-0 flex-1 overflow-hidden bg-white py-2 px-2 text-xs sm:text-sm font-medium text-center hover:bg-gray-50 focus:z-10"
                        )}
                        aria-current={item.current ? "page" : undefined}>
                        <item.icon
                          className={classNames(
                            item.current ? "text-gray-900" : "text-gray-400 group-hover:text-gray-500",
                            "block mx-auto flex-shrink-0 h-5 w-5 mb-1 text-center"
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.name}</span>
                      </a>
                    </Link>
                  )
                )}
              </nav>
              {/* add padding to content for mobile navigation*/}
              <div className="block pt-12 md:hidden" />
            </div>
            <LicenseBanner />
          </main>
        </div>
      </div>
    </>
  );
}

function UserDropdown({ small }: { small?: boolean }) {
  const { t } = useLocale();
  const query = useMeQuery();
  const user = query.data;
  const mutation = trpc.useMutation("viewer.away", {
    onSettled() {
      utils.invalidateQueries("viewer.me");
    },
  });
  const utils = trpc.useContext();

  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center w-full space-x-2 cursor-pointer group">
          <span
            className={classNames(
              small ? "w-8 h-8" : "w-10 h-10",
              "bg-gray-300 rounded-full flex-shrink-0 relative"
            )}>
            <Avatar imageSrc={user?.avatar || ""} alt={user?.username || "Nameless User"} />
            {!user?.away && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
            {user?.away && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 border-2 border-white rounded-full"></div>
            )}
          </span>
          {!small && (
            <span className="flex items-center flex-grow truncate">
              <span className="flex-grow text-sm truncate">
                <span className="block font-medium text-gray-900 truncate">
                  {user?.username || "Nameless User"}
                </span>
                <span className="block font-normal truncate text-neutral-500">
                  {user?.username ? `cal.com/${user.username}` : "No public page"}
                </span>
              </span>
              <SelectorIcon
                className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-gray-500"
                aria-hidden="true"
              />
            </span>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <a
            onClick={() => {
              mutation.mutate({ away: !user?.away });
              utils.invalidateQueries("viewer.me");
            }}
            className="flex px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 hover:text-gray-900">
            <MoonIcon
              className={classNames(
                user?.away
                  ? "text-purple-500 group-hover:text-purple-700"
                  : "text-gray-500 group-hover:text-gray-700",
                "mr-2 flex-shrink-0 h-5 w-5"
              )}
              aria-hidden="true"
            />
            {user?.away ? t("set_as_free") : t("set_as_away")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="h-px bg-gray-200" />
        {user?.username && (
          <DropdownMenuItem>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={`${process.env.NEXT_PUBLIC_APP_URL}/${user.username}`}
              className="flex items-center px-4 py-2 text-sm text-gray-700">
              <ExternalLinkIcon className="w-5 h-5 mr-3 text-gray-500" /> {t("view_public_page")}
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="h-px bg-gray-200" />
        <DropdownMenuItem>
          <a
            href="https://cal.com/slack"
            target="_blank"
            rel="noreferrer"
            className="flex px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
            <svg
              viewBox="0 0 2447.6 2452.5"
              className={classNames(
                "text-gray-500 group-hover:text-gray-700",
                "mt-0.5 mr-3 flex-shrink-0 h-4 w-4"
              )}
              xmlns="http://www.w3.org/2000/svg">
              <g clipRule="evenodd" fillRule="evenodd">
                <path
                  d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z"
                  fill="#9BA6B6"></path>
                <path
                  d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z"
                  fill="#9BA6B6"></path>
                <path
                  d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z"
                  fill="#9BA6B6"></path>
                <path
                  d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0"
                  fill="#9BA6B6"></path>
              </g>
            </svg>
            {t("join_our_slack")}
          </a>
        </DropdownMenuItem>
        <HelpMenuItemDynamic />
        <DropdownMenuSeparator className="h-px bg-gray-200" />
        <DropdownMenuItem>
          <a
            onClick={() => signOut({ callbackUrl: "/auth/logout" })}
            className="flex px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 hover:text-gray-900">
            <LogoutIcon
              className={classNames("text-gray-500 group-hover:text-gray-700", "mr-2 flex-shrink-0 h-5 w-5")}
              aria-hidden="true"
            />
            {t("sign_out")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </Dropdown>
  );
}
