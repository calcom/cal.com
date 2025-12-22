import { useSession } from "next-auth/react";
import Link from "next/link";

import { useIsEmbed } from "@calcom/embed-core/embed-iframe";
import { KBarTrigger } from "@calcom/features/kbar/Kbar";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui/components/icon";
import { Logo } from "@calcom/ui/components/logo";

import { UserDropdown } from "./user-dropdown/UserDropdown";

export function TopNavContainer() {
  const { status } = useSession();
  if (status !== "authenticated") return null;
  return <TopNav />;
}

function TopNav() {
  const isEmbed = useIsEmbed();
  const { t } = useLocale();
  return (
    <>
      <nav
        style={isEmbed ? { display: "none" } : {}}
        className="bg-cal-muted/50 border-subtle sticky top-0 z-40 flex w-full items-center justify-between border-b px-4 py-1.5 backdrop-blur-lg sm:p-4 md:hidden">
        <Link href="/event-types">
          <Logo />
        </Link>
        <div className="flex items-center gap-2 self-center">
          <span className="hover:bg-cal-muted hover:text-emphasis text-default group flex items-center rounded-full text-sm font-medium transition lg:hidden">
            <KBarTrigger />
          </span>
          <button className="hover:bg-cal-muted hover:text-subtle text-muted rounded-full p-1 transition focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2">
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
