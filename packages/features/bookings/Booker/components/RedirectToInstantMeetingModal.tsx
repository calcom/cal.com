import { usePathname } from "next/navigation";

import { getQueryParam } from "@calcom/features/bookings/Booker/utils/query-param";
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
            <div className="text-center">
              <p className="font-medium">{t("connecting_you_to_someone")}</p>
              {/* TODO: Add countdown from 60 seconds
                  We are connecting you!
                  Please schedule a future call if we're not available in XX seconds.
              */}

              {/* Once countdown ends: 
                  Oops, we couldn't connect you this time.
                  Please schedule a future call instead. We value your time.  
              */}

              <p className="font-medium">{t("please_do_not_close_this_tab")}</p>
              <div className="h-[450px]">
                <iframe className="mx-auto h-full" src="https://cal.games/" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
