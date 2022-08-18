import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import Loader from "@calcom/ui/v2/core/Loader";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import DestinationCalendarSelector from "@calcom/ui/v2/modules/event-types/DestinationCalendarSelector";

import { QueryCell } from "@lib/QueryCell";

function CalendarsView() {
  const query = trpc.useQuery(["viewer.connectedCalendars"]);
  const mutation = trpc.useMutation("viewer.setDestinationCalendar");

  return (
    <QueryCell
      query={query}
      success={({ data }) => {
        return (
          <div>
            <div className="mt-4 rounded-md  border-neutral-200 bg-white p-2 sm:mx-0 sm:p-10 md:border md:p-6 xl:mt-0">
              <div className="mt-4 rounded-md  border-neutral-200 bg-white p-2 sm:mx-0 sm:p-10 md:border md:p-2 xl:mt-0">
                <Icon.FiCalendar className="h-5 w-5" />
              </div>
              <h4 className="leading-20 mt-2 text-xl font-semibold text-black">Add to calendar</h4>
              {/* Replace with Trans */}
              <p className="pb-2 text-sm text-gray-600">
                Where to add events when you re booked. You can override this on a per-event basis in advanced
                settings in the event type.
              </p>
              <DestinationCalendarSelector
                hidePlaceholder
                value={data.destinationCalendar?.externalId}
                onChange={mutation.mutate}
                isLoading={mutation.isLoading}
              />
            </div>

            <h4 className="leading-20 mt-12 text-xl font-semibold text-black">Check for conflicts</h4>
            {/* Replace with Trans */}
            <p className="pb-2 text-sm text-gray-600">
              Select which calendars you want to check for conflicts to prevent double bookings.
            </p>
            <div className="mt-1 rounded-md  border-neutral-200 bg-white p-2 sm:mx-0 sm:p-10 md:border md:p-6 xl:mt-0">
              Calendar list
            </div>
          </div>
        );
      }}
    />
  );
}

CalendarsView.getLayout = getLayout;

export default CalendarsView;
