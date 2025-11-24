import { Button } from "@calid/features/ui/components/button";
import { Icon } from "@calid/features/ui/components/icon";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import UnconfirmedBookingBadge from "@calcom/features/bookings/UnconfirmedBookingBadge";
import {
  useOrgBranding,
  type OrganizationBranding,
} from "@calcom/features/ee/organizations/context/provider";
import { KBarTrigger } from "@calcom/features/kbar/Kbar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import classNames from "@calcom/ui/classNames";
import { showToast } from "@calcom/ui/components/toast";

import { TeamInviteBadge } from "../TeamInviteBadge";
import type { NavigationItemType } from "./NavigationItem";
import { NavigationItem, MobileNavigationItem, MobileNavigationMoreItem } from "./NavigationItem";

declare global {
  interface Window {
    openOneHashChat?: () => void;
  }
}

export const MORE_SEPARATOR_NAME = "more";

const getNavigationItems = (orgBranding: OrganizationBranding, userId: number): NavigationItemType[] => [
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
    shouldDisplay: (user) => {
      // Don't show if user data is not loaded yet
      if (!user) return false;
      const yearClaimed = user?.metadata?.isProUser?.yearClaimed || 0;
      return yearClaimed < 2;
    },
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
        if (window.openOneHashChat) {
          window.openOneHashChat();
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
  const orgBranding = useOrgBranding();
  const session = useSession();
  const userId = session.data?.user.id || 0;

  return useMemo(() => {
    const items = !isPlatformNavigation ? getNavigationItems(orgBranding, userId) : platformNavigationItems;

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
  }, [isPlatformNavigation, orgBranding]);
};

type TIntegrationRequest = {
  account_name: string;
  account_user_id: number;
  account_user_email: string;
};

//OH CHAT INTEGRATION REQUESTS COMPONENTS
const IntegrationRequests = () => {
  const { data: user } = useMeQuery();
  const { t } = useLocale();

  const [integrationRequests, setIntegrationRequests] = useState<TIntegrationRequest[]>([]);
  const [loadingBtn, setLoadingBtn] = useState<string>("");

  useEffect(() => {
    const userMeta = isPrismaObjOrUndefined(user?.metadata);
    if (userMeta) {
      setIntegrationRequests((userMeta.chat_integration_requests as TIntegrationRequest[]) ?? []);
    }
  }, [user]);

  const handleReq = async (account_user_id: number, accept: boolean) => {
    try {
      setLoadingBtn(`${account_user_id}-${accept ? "a" : "r"}`);
      if (!user?.id) return;

      const res = await fetch("/api/integrations/oh/chat/internal", {
        method: "POST",
        body: JSON.stringify({
          cal_user_id: user.id,
          account_user_id,
          status: accept,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        showToast("Failed to handle request", "error");
        return;
      }

      const data = await res.json();
      showToast(data.message, "success");
      setIntegrationRequests((prev) => prev.filter((el) => el.account_user_id !== account_user_id));
    } finally {
      setLoadingBtn("");
    }
  };

  if (!integrationRequests?.length) return null;

  return (
    <div className="md:px-2 md:py-1.5">
      <Tooltip content={t("chat_integration_desc")}>
        <div className="flex gap-3 md:hidden md:gap-2 lg:flex">
          <Icon name="webhook" className="h-4 w-4" />
          <span className="text-default text-sm">Chat Integrations</span>
        </div>
      </Tooltip>

      <div className="scrollbar-none max-h-[400px] overflow-y-auto overflow-x-hidden">
        {integrationRequests.map((req) => (
          <div key={req.account_user_id} className="my-2 rounded-md border p-2">
            <div className="mb-2 text-sm font-normal">
              <p className="break-words">
                {`${t("email")} :`} <span className="text-default">{req.account_user_email}</span>
              </p>
              <p>
                Account : <span className="text-default capitalize">{req.account_name}</span>
              </p>
            </div>

            <div className="space-between flex gap-2">
              <Button
                size="sm"
                loading={loadingBtn === `${req.account_user_id}-a`}
                disabled={loadingBtn.includes(`${req.account_user_id}`)}
                onClick={() => handleReq(req.account_user_id, true)}
                color="secondary">
                <span className="text-sm font-normal">Accept</span>
              </Button>
              <Button
                size="sm"
                loading={loadingBtn === `${req.account_user_id}-r`}
                disabled={loadingBtn.includes(`${req.account_user_id}`)}
                onClick={() => handleReq(req.account_user_id, false)}
                color="destructive">
                <span className="text-sm font-normal">Reject</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

      <IntegrationRequests />
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
