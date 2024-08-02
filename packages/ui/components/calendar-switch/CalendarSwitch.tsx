import { type ICalendarSwitchProps } from "@calcom/features/calendars/CalendarSwitch";
import { classNames } from "@calcom/lib";
import { Icon } from "@calcom/ui";

export function CalendarSwitchComponent(
  props: ICalendarSwitchProps & {
    isLoading: boolean;
    Switch: JSX.Element;
    translations?: {
      spanText?: string;
    };
  }
) {
  const {
    externalId,
    name,
    isLoading,
    translations = {
      spanText: "Adding events to",
    },
    // the switch can be children
    Switch,
  } = props;

  return (
    <div className={classNames("my-2 flex flex-row items-center")}>
      <div className="flex pl-2">{Switch}</div>
      <label className="ml-3 text-sm font-medium leading-5" htmlFor={externalId}>
        {name}
      </label>
      Hello {props.destination}
      {!!props.destination && (
        <span className="bg-subtle text-default ml-8 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-normal sm:ml-4">
          <Icon name="arrow-left" className="h-4 w-4" />
          {translations.spanText}
        </span>
      )}
      {!!props.destination && <>This is the destination calendar</>}
      {isLoading && <Icon name="rotate-cw" className="text-muted h-4 w-4 animate-spin ltr:ml-1 rtl:mr-1" />}
    </div>
  );
}
