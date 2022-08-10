import { useSession } from "next-auth/react";
import { Trans } from "next-i18next";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/Alert";

function ImpersonatingBanner() {
  const { t } = useLocale();
  const { data } = useSession();

  if (!data?.user.impersonatedByUID) return null;

  return (
    <Alert
      severity="warning"
      title={
        <>
          {t("impersonating_user_warning", { user: data.user.username })}{" "}
          <Trans i18nKey="impersonating_stop_instructions">
            <a href="/auth/logout" className="underline">
              Click Here To stop
            </a>
            .
          </Trans>
        </>
      }
      className="mx-4 mb-2 sm:mx-6  md:mx-8"
    />
  );
}

export default ImpersonatingBanner;
