import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferMutationInput, trpc } from "@calcom/trpc/react";

import DestinationCalendarSelector from "@components/DestinationCalendarSelector";

interface ICreateEventsOnCalendarSelectProps {
  calendar?: inferMutationInput<"viewer.setDestinationCalendar"> | null;
}

const CreateEventsOnCalendarSelect = (props: ICreateEventsOnCalendarSelectProps) => {
  const { calendar } = props;
  const { t } = useLocale();
  const mutation = trpc.useMutation(["viewer.setDestinationCalendar"]);

  return (
    <>
      <div className="mt-6 flex flex-row">
        <div className="w-full">
          <label htmlFor="createEventsOn" className="flex text-sm font-medium text-neutral-700">
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
