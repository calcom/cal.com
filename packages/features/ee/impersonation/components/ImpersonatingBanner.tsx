import type { useSession } from "next-auth/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TopBanner } from "@calcom/ui";

function ImpersonatingBanner({ data }: { data: ReturnType<(typeof useSession)["data"]> }) {
  const { t } = useLocale();

  if (!data?.user.impersonatedByUID) return null;

  return (
    <>
      <TopBanner
        text={t("impersonating_user_warning", { user: data.user.username })}
        variant="warning"
        actions={
          <a className="border-b border-b-black" href="/auth/logout">
            {t("impersonating_stop_instructions")}
          </a>
        }
      />
    </>
  );
}

export default ImpersonatingBanner;
