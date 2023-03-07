import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterInputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";

import DestinationCalendarSelector from "@components/DestinationCalendarSelector";

interface ICreateEventsOnCalendarSelectProps {
  calendar?: RouterInputs["viewer"]["setDestinationCalendar"] | null;
}

const CreateEventsOnCalendarSelect = (props: ICreateEventsOnCalendarSelectProps) => {
  const { calendar } = props;
  const { t } = useLocale();
  const mutation = trpc.viewer.setDestinationCalendar.useMutation();

  return (
    <>
      <div className="mt-6 flex flex-row">
        <div className="w-full">
          <label htmlFor="createEventsOn" className="flex text-sm font-medium text-gray-700">
            {t("create_events_on")}
          </label>
          <div className="mt-2">
            <DestinationCalendarSelector
              value={calendar ? calendar.externalId : undefined}
              onChange={(calendar) => {
                mutation.mutate(calendar);
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
