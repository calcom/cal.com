import { ProBadge } from "@calid/features/modules/claim-pro/ProBadge";
import { Icon } from "@calid/features/ui/components/icon";
import { Logo } from "@calid/features/ui/components/logo";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { KBarTrigger } from "@calcom/features/kbar/Kbar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";

import { UserDropdown } from "./user-dropdown/UserDropdown";

export function TopNavContainer() {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return <TopNav />;
}

function TopNav() {
  const isEmbed = useIsEmbed();
  const { t } = useLocale();
  const { data: user } = useMeQuery();

  return (
    <>
      <nav
        style={isEmbed ? { display: "none" } : {}}
        className="bg-muted border-subtle sticky top-0 z-40 flex w-full items-center justify-between border-b bg-opacity-50 px-4 py-1.5 backdrop-blur-lg sm:p-4 md:hidden">
        <Link href="/event-types">
          <div className="flex items-center">
            <Logo />
            {user?.metadata?.isProUser?.yearClaimed > 0 && user?.metadata?.isProUser?.verified && (
              <ProBadge
                yearClaimed={user.metadata.isProUser.yearClaimed}
                validTillDate={user.metadata.isProUser.validTillDate}
                isMobile={true}
              />
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2 self-center text-xs">
          {(!user?.metadata?.isProUser?.yearClaimed || user?.metadata?.isProUser?.yearClaimed < 2) && (
            <button className="offer-moving-bg flex-shrink-0 rounded-md px-2 py-1">
              <Link href="/claim" className="block">
                <span className="text-default whitespace-nowrap text-sm">Claim Pro</span>
              </Link>
            </button>
          )}
          <span className="hover:bg-muted hover:text-emphasis text-default group flex items-center rounded-full text-sm font-medium transition lg:hidden">
            <KBarTrigger />
          </span>
          <button className="hover:bg-muted hover:text-subtle text-muted rounded-full p-1 transition focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
            <span className="sr-only">{t("settings")}</span>
            <Link href="/settings/my-account/profile">
              <Icon name="settings" className="text-default h-4 w-4" aria-hidden="true" />
            </Link>
          </button>
          <UserDropdown small />
        </div>
      </nav>
    </>
  );
}
