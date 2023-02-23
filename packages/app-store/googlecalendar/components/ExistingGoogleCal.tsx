import Link from "next/link";

import { CAL_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { FiAlertCircle, FiArrowRight, FiCheck } from "@calcom/ui/components/icon";

const ExistingGoogleCal = ({ gCalInstalled, appName }: { gCalInstalled?: boolean; appName: string }) => {
  const { t } = useLocale();

  return gCalInstalled ? (
    <div className="rounded-md bg-gray-100 py-3 px-4">
      <div className="items-start space-x-2.5">
        <div className="flex items-start">
          <div>
            <FiCheck className="mt-1 mr-2 font-semibold" />
          </div>
          <div>
            <span className="font-semibold">{t("google_calendar_is_connected")}</span>
            <div>
              <div>
                <span>{t("requires_google_calendar")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="rounded-md bg-blue-100 py-3 px-4 text-blue-900">
      <div className="items-start space-x-2.5">
        <div className="flex items-start">
          <div>
            <FiAlertCircle className="mt-1 mr-2 font-semibold" />
          </div>
          <div>
            <span className="font-semibold">{t("this_app_requires_google_calendar", { appName })}</span>
            <div>
              <div>
                <>
                  <Link
                    href={`${CAL_URL}/apps/google-calendar`}
                    className="flex items-center text-blue-900 underline">
                    <span className="mr-1">{t("connect_google_calendar")}</span>
                    <FiArrowRight />
                  </Link>
                </>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExistingGoogleCal;
