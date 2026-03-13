import { useSession } from "next-auth/react";
import { useMemo } from "react";

import { useIsEmbed } from "@calid/embed-runtime/embed-iframe";
import UnconfirmedBookingBadge from "@calcom/features/bookings/UnconfirmedBookingBadge";
import { KBarTrigger } from "@calcom/features/kbar/Kbar";
import classNames from "@calcom/ui/classNames";

import { TeamInviteBadge } from "../TeamInviteBadge";
import type { NavigationItemType } from "./NavigationItem";
import { NavigationItem, MobileNavigationItem, MobileNavigationMoreItem } from "./NavigationItem";

declare global {
  interface Window {
    openCrispChat?: () => void;
  }
}

export const MORE_SEPARATOR_NAME = "more";

const getNavigationItems = (userId: number): NavigationItemType[] => [
  {
    name: "home",
    href: "/home",
    icon: "house",
  },
  {
    name: "event_types_page_title",
    href: "/event-types",
    icon: "scroll-text",
  },
  {
    name: "bookings",
    href: "/bookings/upcoming",
    icon: "calendar-check",
    badge: <UnconfirmedBookingBadge />,
    isCurrent: ({ pathname }) => pathname?.startsWith("/bookings") ?? false,
  },
  {
    name: "availability",
    href: "/availability",
    icon: "clock-2",
  },
  {
    name: "Claim Pro",
    href: "/claim",
    icon: "badge-percent",
    onlyDesktop: true,
  },
  {
    name: "teams",
    href: "/teams",
    icon: "users",
    badge: <TeamInviteBadge />,
    moreOnMobile: true,
  },
  {
    name: "apps",
    href: "/apps",
    icon: "blocks",
    moreOnMobile: true,
    isCurrent: ({ pathname: path, item }) => {
      // During Server rendering path is /v2/apps but on client it becomes /apps(weird..)
      return (path?.startsWith(item.href) ?? false) && !(path?.includes("routing-forms/") ?? false);
    },
  },
  {
    name: "help",
    icon: "circle-help",
    onlyMobile: true,
    onClick: (e) => {
      e.preventDefault();
      if (typeof window !== "undefined") {
        if (window.openCrispChat) {
          window.openCrispChat();
        } else {
        }
      } else {
        console.error("Window object not available");
      }
    },
  },
  {
    name: MORE_SEPARATOR_NAME,
    href: "/more",
    icon: "ellipsis",
  },
  {
    name: "routing",
    href: "/routing",
    icon: "list-tree",
    isCurrent: ({ pathname }) => pathname?.startsWith("/routing") ?? false,
    moreOnMobile: true,
  },
  {
    name: "workflows",
    href: `/workflows?userIds=${userId}`,
    icon: "workflow",
    moreOnMobile: true,
    isCurrent: ({ pathname }) => {
      if (!pathname) return false;
      return pathname.startsWith("/workflows");
    },
  },
  {
    name: "insights",
    href: "/insights/bookings",
    icon: "chart-no-axes-column-increasing",
    isCurrent: ({ pathname: path }) => path?.startsWith("/insights") ?? false,
    moreOnMobile: true,
  },
  {
    name: "settings",
    href: "/settings/my-account/profile",
    icon: "settings",
    onlyDesktop: true,
  },
];

const platformNavigationItems: NavigationItemType[] = [
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
  {
    name: "Billing",
    href: "/settings/platform/billing",
    icon: "credit-card",
    moreOnMobile: true,
  },
  {
    name: "Members",
    href: "/settings/platform/members",
    icon: "users",
    moreOnMobile: true,
  },
  {
    name: "Managed Users",
    href: "/settings/platform/managed-users",
    icon: "users",
    moreOnMobile: true,
  },
];

const useNavigationItems = (isPlatformNavigation = false) => {
  const session = useSession();
  const userId = session.data?.user.id || 0;

  return useMemo(() => {
    const items = !isPlatformNavigation ? getNavigationItems(userId) : platformNavigationItems;

    const desktopNavigationItems = items.filter(
      (item) => item.name !== MORE_SEPARATOR_NAME && !item.onlyMobile
    );
    const mobileNavigationBottomItems = items.filter(
      (item) => (!item.moreOnMobile && !item.onlyDesktop) || item.name === MORE_SEPARATOR_NAME
    );
    const mobileNavigationMoreItems = items.filter(
      (item) => item.moreOnMobile && !item.onlyDesktop && item.name !== MORE_SEPARATOR_NAME
    );

    return { desktopNavigationItems, mobileNavigationBottomItems, mobileNavigationMoreItems };
  }, [isPlatformNavigation]);
};

export const Navigation = ({ isPlatformNavigation = false }: { isPlatformNavigation?: boolean }) => {
  const { desktopNavigationItems } = useNavigationItems(isPlatformNavigation);
  return (
    <nav className="mt-10 flex-1 md:px-2 lg:px-0">
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
  const { mobileNavigationBottomItems } = useNavigationItems(isPlatformNavigation);

  return (
    <>
      <nav
        className={classNames(
          "pwa:pb-[max(0.25rem,env(safe-area-inset-bottom))] pwa:-mx-2 bg-muted border-subtle fixed bottom-0 left-0 z-30 flex w-full border-t bg-opacity-40 px-1 shadow backdrop-blur-md md:hidden",
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
  const { mobileNavigationMoreItems } = useNavigationItems();

  return (
    <ul className="border-subtle mt-2 rounded-md border">
      {mobileNavigationMoreItems.map((item) => (
        <MobileNavigationMoreItem key={item.name} item={item} />
      ))}
    </ul>
  );
};
