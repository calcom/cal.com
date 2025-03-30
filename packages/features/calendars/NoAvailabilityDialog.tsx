import { useState } from "react";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { calculatePeriodLimits, isTimeViolatingFutureLimit } from "@calcom/lib/isOutOfBounds";
import type { PeriodData } from "@calcom/types/event";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";

const NoAvailabilityDialog = ({
  month,
  nextMonthButton,
  browsingDate,
  periodData,
}: {
  month: string | null;
  nextMonthButton: () => void;
  browsingDate: Dayjs;
  periodData: PeriodData;
}) => {
  const { t } = useLocale();
  const [isOpenDialog, setIsOpenDialog] = useState(true);
  const { periodDays, periodType, periodCountCalendarDays, periodEndDate, periodStartDate } = periodData;
  const periodLimits = calculatePeriodLimits({
    periodType,
    periodDays,
    periodCountCalendarDays,
    periodStartDate,
    periodEndDate,
    allDatesWithBookabilityStatusInBookerTz: null, // Temporary workaround
    _skipRollingWindowCheck: true,
    eventUtcOffset: 0,
    bookerUtcOffset: 0,
  });
  // Check if the current month is beyond limits set for Rolling or Range period types
  const isOutOfBoundsByPeriod = isTimeViolatingFutureLimit({
    time: browsingDate.endOf("month").toDate(),
    periodLimits,
  });
  // Message explaining lack of availability differs based on period type
  let description = "";
  if (isOutOfBoundsByPeriod && periodType === "ROLLING") {
    const daysDescription = periodCountCalendarDays ? t("calendar_days") : t("business_days");
    description = t("no_availability_rolling", { days: `${periodDays} ${daysDescription}` });
  } else if (isOutOfBoundsByPeriod && periodType === "RANGE") {
    description = t("no_availability_range", { date: dayjs(periodEndDate).format("MMMM D YYYY") });
  }

  const closeDialog = () => {
    setIsOpenDialog(false);
  };
  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={(open) => {
        setIsOpenDialog(open);
      }}>
      <DialogContent
        title={t("no_availability_in_month", { month: month })}
        type="creation"
        description={description}
        preventCloseOnOutsideClick={false}>
        <DialogFooter>
          <DialogClose
            color={isOutOfBoundsByPeriod ? "primary" : "secondary"}
            onClick={closeDialog}
            data-testid="close_dialog_button">
            {t("ok")}
          </DialogClose>
          {
            // Only show the next month button if there is a possibility of availability in the future
            !isOutOfBoundsByPeriod && (
              <Button
                color="primary"
                onClick={nextMonthButton}
                data-testid="view_next_month"
                EndIcon="arrow-right">
                {t("view_next_month")}
              </Button>
            )
          }
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NoAvailabilityDialog;
