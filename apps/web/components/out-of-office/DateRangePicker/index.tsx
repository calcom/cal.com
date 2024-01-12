import type { BookingRedirectForm } from "@pages/settings/my-account/out-of-office";
import { DateRangePicker } from "@tremor/react";
import type { UseFormSetValue } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import "./DateSelect.css";

interface IOutOfOfficeDateRangeSelectProps {
  dateRange: [Date | null, Date | null, null];
  setDateRange: React.Dispatch<React.SetStateAction<[Date | null, Date | null, null]>>;
  setValue: UseFormSetValue<BookingRedirectForm>;
}

const OutOfOfficeDateRangePicker = (props: IOutOfOfficeDateRangeSelectProps) => {
  const { t } = useLocale();
  const { dateRange, setDateRange, setValue } = props;
  return (
    <div className="custom-date">
      <DateRangePicker
        value={dateRange}
        defaultValue={dateRange}
        onValueChange={(datesArray) => {
          const [start, end] = datesArray;

          if (start) {
            setDateRange([start, end as Date | null, null]);
          }
          if (start && end) {
            setValue("startDate", start.toISOString());
            setValue("endDate", end.toISOString());
          }
        }}
        color="gray"
        options={undefined}
        enableDropdown={false}
        placeholder={t("select_date_range")}
        enableYearPagination={true}
        minDate={dayjs().startOf("d").toDate()}
        maxDate={dayjs().add(2, "y").endOf("d").toDate()}
      />
    </div>
  );
};

export { OutOfOfficeDateRangePicker };
