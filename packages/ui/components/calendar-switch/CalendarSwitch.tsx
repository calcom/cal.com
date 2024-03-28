import { type ICalendarSwitchProps } from "@calcom/features/calendars/CalendarSwitch";
import { classNames } from "@calcom/lib";
import { Switch } from "@calcom/ui";
import { ArrowLeft, RotateCw } from "@calcom/ui/components/icon";

export function CalendarSwitchComponent(
  props: ICalendarSwitchProps & {
    isLoading: boolean;
    onCheckedChange: (isOn: boolean) => void;
    translations?: {
      spanText?: string;
    };
  }
) {
  const {
    externalId,
    isChecked,
    name,
    onCheckedChange,
    isLoading,
    translations = {
      spanText: "Adding events to",
    },
  } = props;

  return (
    <div className={classNames("my-2 flex flex-row items-center")}>
      <div className="flex pl-2">
        <Switch id={externalId} checked={isChecked} disabled={isLoading} onCheckedChange={onCheckedChange} />
      </div>
      <label className="ml-3 text-sm font-medium leading-5" htmlFor={externalId}>
        {name}
      </label>
      {!!props.destination && (
        <span className="bg-subtle text-default ml-8 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-normal sm:ml-4">
          <ArrowLeft className="h-4 w-4" />
          {translations.spanText}
        </span>
      )}
      {isLoading && <RotateCw className="text-muted h-4 w-4 animate-spin ltr:ml-1 rtl:mr-1" />}
    </div>
  );
}
