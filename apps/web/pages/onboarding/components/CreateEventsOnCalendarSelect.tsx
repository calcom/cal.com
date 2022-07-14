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
      <div className="block items-center sm:flex">
        <div className="min-w-48 mb-4 sm:mb-0">
          <label htmlFor="createEventsOn" className="flex text-sm font-medium text-neutral-700">
            {t("create_events_on")}
          </label>
        </div>
        <div className="w-full">
          <div className="relative mt-1 rounded-sm">
            <DestinationCalendarSelector
              value={calendar ? calendar.externalId : undefined}
              // onChange={onChange}
              onChange={() => {
                console.log("onChange");
              }}
              hidePlaceholder
            />
          </div>
        </div>
      </div>
    </>
  );
};

export { CreateEventsOnCalendarSelect };
