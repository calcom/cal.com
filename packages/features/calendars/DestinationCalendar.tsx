import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import type { DestinationCalendarSelectorProps } from "@calcom/features/calendars/DestinationCalendarSelector";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Label } from "@calcom/ui";

type Props = {
  isForm?: boolean;
} & DestinationCalendarSelectorProps;

const DestinationCalendarComponent = ({ isForm = false, ...rest }: Props) => {
  const { t } = useLocale();
  return (
    <div>
      <div className="border-subtle mt-8 rounded-t-lg border px-4 py-6 sm:px-6">
        <h2 className="text-emphasis mb-1 text-base font-bold leading-5 tracking-wide">
          {t("add_to_calendar")}
        </h2>
        <p className="text-subtle text-sm leading-tight">{t("add_to_calendar_description")}</p>
      </div>
      <div
        className={`border-subtle flex w-full flex-col space-y-3 border border-x ${
          isForm ? "border-y-0" : "rounded-b-lg border-t-0"
        } px-4 py-6 sm:px-6`}>
        <div>
          <Label className="text-default mb-0 font-medium">{t("add_events_to")}</Label>
          <DestinationCalendarSelector hidePlaceholder {...rest} />
        </div>
      </div>
    </div>
  );
};

export default DestinationCalendarComponent;
