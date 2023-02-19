import { Trans } from "next-i18next";
import Link from "next/link";

import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { SkeletonText } from "@calcom/ui";
import { FiAlertCircle } from "@calcom/ui/components/icon";

const ExistingGoogleCal = () => {
  const { t } = useLocale();
  const { isLoading, data: hasGoogleCal } = trpc.viewer.appsRouter.checkForGCal.useQuery();

  return (
    <div className="rounded-md bg-blue-100 py-3 px-4 text-blue-900">
      <div className="flex items-start space-x-2.5">
        <div>
          <FiAlertCircle className="font-semibold" />
        </div>
        <div>
          <span className="font-semibold">{t("requires_google_calendar")}</span>
          <div>
            <>
              {isLoading ? (
                <SkeletonText className="h-4 w-full" />
              ) : hasGoogleCal ? (
                t("connected_google_calendar")
              ) : (
                <Trans i18nKey="no_google_calendar">
                  Please connect your Google Calendar account{" "}
                  <Link href={`${CAL_URL}/apps/google-calendar`} className="font-semibold text-blue-900">
                    here
                  </Link>
                </Trans>
              )}
            </>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExistingGoogleCal;
