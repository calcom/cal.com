import Link from "next/link";

import { useTranslations } from "@calcom/lib/i18n/hooks/useTranslations";
import { type RouterOutputs } from "@calcom/trpc";
import { TopBanner } from "@calcom/ui";

export type CalendarCredentialBannerProps = {
  data: RouterOutputs["viewer"]["getUserTopBanners"]["calendarCredentialBanner"];
};

function CalendarCredentialBanner({ data }: CalendarCredentialBannerProps) {
  const t = useTranslations();

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
