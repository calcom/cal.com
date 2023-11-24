import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { TopBanner } from "@calcom/ui";

function CalendarCredentialBanner({
  data,
}: {
  data: RouterOutputs["viewer"]["getUserTopBanners"]["calendarCredentialBanner"];
}) {
  const { t } = useLocale();

  if (!data) return null;

  return (
    <>
      <TopBanner
        text={`${t("something_went_wrong")} ${t("calendar_error")}`}
        variant="error"
        actions={
          <Link href="/apps/installed/calendar" className="border-b border-b-black">
            {t("check_here")}
          </Link>
        }
      />
    </>
  );
}

export default CalendarCredentialBanner;
