import Link from "next/link";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Icon } from "@calcom/ui";

const ExistingGoogleCal = ({ gCalInstalled, appName }: { gCalInstalled?: boolean; appName: string }) => {
  const { t } = useLocale();

  return gCalInstalled ? (
    <div className="bg-subtle rounded-md px-4 py-3">
      <div className="items-start space-x-2.5">
        <div className="flex items-start">
          <div>
            <Icon name="check" className="mr-2 mt-1 font-semibold" />
          </div>
          <div>
            <span className="font-semibold">{t("connected_google_calendar")}</span>
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
    <div className="bg-info text-info rounded-md px-4 py-3">
      <div className="items-start space-x-2.5">
        <div className="flex items-start">
          <div>
            <Icon name="circle-alert" className="mr-2 mt-1 font-semibold" />
          </div>
          <div>
            <span className="font-semibold">{t("requires_google_calendar", { appName })}</span>
            <div>
              <div>
                <>
                  <Link
                    href={`${WEBAPP_URL}/apps/google-calendar`}
                    className="text-info flex items-center underline">
                    <span className="mr-1">{t("connected_google_calendar")}</span>
                    <Icon name="arrow-right" />
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
