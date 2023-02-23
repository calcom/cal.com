import Link from "next/link";

import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FiAlertCircle, FiArrowRight } from "@calcom/ui/components/icon";

import appsThatRequiresGoogleCal from "../lib/requiresGoogleCal";

const ExistingGoogleCal = ({
  slug,
  gCalInstalled,
  appName,
}: {
  slug: string;
  gCalInstalled?: boolean;
  appName: string;
}) => {
  const { t } = useLocale();

  if (!appsThatRequiresGoogleCal.some((app) => app === slug)) return <></>;

  return (
    <div className="rounded-md bg-blue-100 py-3 px-4 text-blue-900">
      <div className="flex items-start space-x-2.5">
        <div>
          <FiAlertCircle className="font-semibold" />
        </div>
        <div>
          <span className="font-semibold">{t("this_app_requires_google_calendar", { appName })}</span>
          <div>
            <>
              {/* {isLoading ? (
                <SkeletonText className="h-4 w-full" />
              ) : hasGoogleCal ? (
                t("connected_google_calendar")
              ) : ( */}
              <Link href={`${CAL_URL}/apps/google-calendar`} className="flex items-center text-blue-900">
                <span className="mr-1">{t("connect_google_calendar")}</span>
                <FiArrowRight />
              </Link>
              {/* <Trans i18nKey="no_google_calendar">
                Please connect your Google Calendar account{" "}
                <Link href={`${CAL_URL}/apps/google-calendar`} className="font-semibold text-blue-900">
                  here
                </Link>
              </Trans> */}
              {/* )} */}
            </>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExistingGoogleCal;
