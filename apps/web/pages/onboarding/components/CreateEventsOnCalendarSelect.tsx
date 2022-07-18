import { Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";

import DestinationCalendarSelector from "@components/DestinationCalendarSelector";

interface ICreateEventsOnCalendarSelectProps {
  calendar: any;
}

const CreateEventsOnCalendarSelect = (props: ICreateEventsOnCalendarSelectProps) => {
  const { calendar } = props;
  const { t } = useLocale();
  return (
    <>
      <div className="mt-6 flex flex-row">
        <div className="w-full">
          <label htmlFor="createEventsOn" className="flex text-sm font-medium text-neutral-700">
            {t("create_events_on")}
          </label>
          <div className="mt-2">
            <Controller
              control={formMethods.control}
              name="destinationCalendar"
              // defaultValue={eventType.destinationCalendar || undefined}
              render={({ field: { onChange, value } }) => (
                <DestinationCalendarSelector
                  value={calendar ? calendar.externalId : undefined}
                  // onChange={onChange}
                  onChange={() => {
                    console.log("onChange");
                  }}
                  hidePlaceholder
                />
              )}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export { CreateEventsOnCalendarSelect };
