"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MobileNavigationMoreItems } from "~/shell/navigation/Navigation";
import Shell from "~/shell/Shell";

export default function MorePage() {
  const { t } = useLocale();
  return (
    <Shell>
      <div className="max-w-(--breakpoint-lg)">
        <MobileNavigationMoreItems />
        <p className="text-subtle mt-6 text-xs leading-tight md:hidden">{t("more_page_footer")}</p>
      </div>
    </Shell>
  );
}
