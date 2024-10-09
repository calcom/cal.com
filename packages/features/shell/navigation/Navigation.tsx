import { useSession } from "next-auth/react";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import UnconfirmedBookingBadge from "@calcom/features/bookings/UnconfirmedBookingBadge";
import { KBarTrigger } from "@calcom/features/kbar/Kbar";
import { classNames } from "@calcom/lib";

import { TeamInviteBadge } from "../TeamInviteBadge";
import type { NavigationItemType } from "./NavigationItem";
import { NavigationItem, MobileNavigationItem, MobileNavigationMoreItem } from "./NavigationItem";

export const MORE_SEPARATOR_NAME = "more";

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
    name: "routing_forms",
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
    icon: "chart-bar",
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
    icon: "chart-bar",
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

export const getDesktopNavigationItems = (isPlatformNavigation = false) => {
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

export const Navigation = ({ isPlatformNavigation = false }: { isPlatformNavigation?: boolean }) => {
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

export function MobileNavigationContainer({
  isPlatformNavigation = false,
}: {
  isPlatformNavigation?: boolean;
}) {
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
