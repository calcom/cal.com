import BottomNav from "@calid/features/ui/BottomNav";
import { Logo } from "@calid/features/ui/components/logo";
import ProductHuntBadge from "@calid/features/ui/components/producthunt";
import type { User as UserAuth } from "next-auth";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import classNames from "@calcom/ui/classNames";

import { Navigation } from "./navigation/Navigation";

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
  const pathname = usePathname();
  const isPlatformPages = pathname?.startsWith("/settings/platform");

  const sidebarStylingAttributes = {
    maxHeight: `calc(100vh - ${bannersHeight}px)`,
    top: `${bannersHeight}px`,
  };

  return (
    <div className="relative">
      <aside
        style={!isPlatformPages ? sidebarStylingAttributes : {}}
        className={classNames(
          "bg-cal-gradient dark:bg-cal-gradient border-muted fixed left-0 hidden h-full w-14 flex-col overflow-y-auto overflow-x-hidden border-r md:sticky md:flex lg:w-56 lg:px-4",
          !isPlatformPages && "max-h-screen"
        )}>
        <div className="flex h-full flex-col justify-between py-6">
          {/* logo icon for tablet */}
          <Link href="/event-types" className="px-2 text-center md:inline">
            <Logo small icon />
          </Link>
          <Navigation isPlatformNavigation={isPlatformPages} />
        </div>
        <div>
          <div className="mb-3">
            <ProductHuntBadge />
          </div>

          <BottomNav />
        </div>
      </aside>
    </div>
  );
}
