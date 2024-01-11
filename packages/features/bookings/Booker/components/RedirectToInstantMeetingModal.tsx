import { usePathname } from "next/navigation";

import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
import { Spinner } from "@calcom/features/calendars/weeklyview/components/spinner/Spinner";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Dialog, DialogContent } from "@calcom/ui";
import { Button } from "@calcom/ui";

export const RedirectToInstantMeetingModal = ({
  hasInstantMeetingTokenExpired,
}: {
  hasInstantMeetingTokenExpired: boolean;
}) => {
  const { t } = useLocale();
  const pathname = usePathname();
  const bookingId = parseInt(getQueryParam("bookingId") || "0");

  return (
    <Dialog open={!!bookingId}>
      <DialogContent enableOverflow className="py-8">
        <div>
          {hasInstantMeetingTokenExpired ? (
            <div>
              <p className="font-medium">{t("please_book_a_time_sometime_later")}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  // Prevent null on app directory
                  if (pathname) window.location.href = pathname;
                }}
                color="primary">
                {t("go_back")}
              </Button>
            </div>
          ) : (
            <div>
              <p className="font-medium">{t("connecting_you_to_someone")}</p>
              <p className="font-medium">{t("please_do_not_close_this_tab")}</p>
              <Spinner className="relative mt-8" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
