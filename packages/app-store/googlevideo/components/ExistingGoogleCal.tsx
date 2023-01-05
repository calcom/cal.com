import { Trans } from "next-i18next";
import { useState } from "react";

import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc";
import { Icon, SkeletonText } from "@calcom/ui";

const ExistingGoogleCal = () => {
  const { t } = useLocale();
  const [firstGoogleCal, setFirstGoogleCal] = useState<string | undefined>();

  const query = trpc.viewer.connectedCalendars.useQuery(undefined, {
    onSuccess: (data) => {
      const googleCalQuery = data?.connectedCalendars.find(
        (calendar) => calendar.primary?.integration === "google_calendar"
      );
      if (googleCalQuery?.primary) setFirstGoogleCal(googleCalQuery.primary?.externalId);
    },
  });

  return (
    <div className="rounded-md bg-blue-100 py-3 px-4 text-blue-900">
      <div className="flex items-start space-x-2.5">
        <div>
          <Icon.FiAlertCircle className="font-semibold" />
        </div>
        <div>
          <span className="font-semibold">{t("requires_google_calendar")}</span>
          <div>
            <>
              {query.isLoading ? (
                <SkeletonText className="h-4 w-full" />
              ) : firstGoogleCal ? (
                t("connected_google_calendar", { account: firstGoogleCal })
              ) : (
                <Trans i18nKey="no_google_calendar">
                  Please connect your Google Calendar account{" "}
                  <a href={`${CAL_URL}/apps/google-calendar`} className="font-semibold text-blue-900">
                    here
                  </a>
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
