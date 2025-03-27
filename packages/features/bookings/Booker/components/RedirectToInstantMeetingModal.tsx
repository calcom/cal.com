import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

import dayjs from "@calcom/dayjs";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent } from "@calcom/ui/components/dialog";

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  const message = "/o";
  event.returnValue = message; // Standard for most browsers
  return message; // For some older browsers
};

export const RedirectToInstantMeetingModal = ({
  bookingId,
  onGoBack,
  expiryTime,
  instantVideoMeetingUrl,
  orgName,
}: {
  bookingId: number;
  onGoBack: () => void;
  expiryTime?: Date;
  instantVideoMeetingUrl?: string;
  orgName?: string | null;
}) => {
  const { t } = useLocale();
  const [timeRemaining, setTimeRemaining] = useState(calculateTimeRemaining());
  const [hasInstantMeetingTokenExpired, setHasInstantMeetingTokenExpired] = useState(false);
  const router = useRouter();

  function calculateTimeRemaining() {
    const now = dayjs();
    const expiration = dayjs(expiryTime);
    const duration = expiration.diff(now);
    return Math.max(duration, 0);
  }

  useEffect(() => {
    if (!expiryTime) return;

    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
      setHasInstantMeetingTokenExpired(expiryTime && new Date(expiryTime) < new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [expiryTime]);

  const formatTime = (milliseconds: number) => {
    const duration = dayjs.duration(milliseconds);
    const seconds = duration.seconds();
    const minutes = duration.minutes();

    return `${minutes}m ${seconds}s`;
  };

  useEffect(() => {
    if (!expiryTime || hasInstantMeetingTokenExpired || !!instantVideoMeetingUrl) {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      return;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [expiryTime, hasInstantMeetingTokenExpired, instantVideoMeetingUrl]);

  useEffect(() => {
    if (!!instantVideoMeetingUrl) {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      router.push(instantVideoMeetingUrl);
    }
  }, [instantVideoMeetingUrl]);

  return (
    <Dialog open={!!bookingId && !!expiryTime}>
      <DialogContent enableOverflow className="py-8">
        <div>
          {hasInstantMeetingTokenExpired ? (
            <div>
              <p className="font-medium">{t("please_book_a_time_sometime_later")}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  onGoBack();
                }}
                color="primary">
                {t("schedule_instead")}
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-medium">{t("connecting_you_to_someone", { orgName })}</p>
              <p className="font-bold">{t("please_do_not_close_this_tab")}</p>
              <p className="mt-2 font-medium">
                {t("please_schedule_future_call", {
                  seconds: formatTime(timeRemaining),
                })}
              </p>

              <div className="mt-4 h-[414px]">
                <iframe className="mx-auto h-full w-[276px] rounded-lg" src="https://cal.games/" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
