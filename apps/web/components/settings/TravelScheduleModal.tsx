import type { FormValues } from "@pages/settings/my-account/general";
import { useState } from "react";
import type { UseFormSetValue } from "react-hook-form";

import { useTimePreferences } from "@calcom/features/bookings/lib/timePreferences";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  Button,
  Label,
  DateRangePicker,
  TimezoneSelect,
  SettingsToggle,
  DatePicker,
} from "@calcom/ui";

interface TravelScheduleModalProps {
  open: boolean;
  onOpenChange: () => void;
  setValue: UseFormSetValue<FormValues>;
  existingSchedules: FormValues["travelSchedules"];
}

const TravelScheduleModal = ({
  open,
  onOpenChange,
  setValue,
  existingSchedules,
}: TravelScheduleModalProps) => {
  const { t } = useLocale();

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const [selectedTimeZone, setSelectedTimeZone] = useState(useTimePreferences().timezone);
  const [isNoEndDate, setIsNoEndDate] = useState(false);

  const createNewSchedule = () => {
    const newSchedule = {
      startDate,
      endDate,
      timeZone: selectedTimeZone,
    };
    setValue("travelSchedules", existingSchedules.concat(newSchedule), { shouldDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("travel_schedule")}
        description={t("travel_schedule_description")}
        type="creation">
        <div>
          {!isNoEndDate ? (
            <>
              <Label className="mt-2">{t("time_range")}</Label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate ?? startDate}
                onDatesChange={({ startDate: newStartDate, endDate: newEndDate }) => {
                  setStartDate(newStartDate);
                  setEndDate(newEndDate);
                }}
              />
            </>
          ) : (
            <>
              <Label className="mt-2">{t("date")}</Label>
              <DatePicker
                minDate={new Date()}
                date={startDate}
                className="w-56"
                onDatesChange={(newDate) => {
                  setStartDate(newDate);
                }}
              />
            </>
          )}

          <div className="mt-3">
            <SettingsToggle
              labelClassName="mt-1 font-normal"
              title="Schedule timezone without end date"
              checked={isNoEndDate}
              onCheckedChange={(e) => {
                setEndDate(!e ? startDate : undefined);
                setIsNoEndDate(e);
              }}
            />
          </div>
          <Label className="mt-6">{t("timezone")}</Label>
          <TimezoneSelect
            id="timeZone"
            value={selectedTimeZone}
            onChange={({ value }) => setSelectedTimeZone(value)}
            className="mb-11 mt-2 w-full rounded-md text-sm"
          />
        </div>
        <DialogFooter showDivider>
          <DialogClose />
          <Button
            onClick={() => {
              createNewSchedule();
              onOpenChange();
            }}>
            {t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TravelScheduleModal;
