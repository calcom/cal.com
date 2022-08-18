import { Fragment } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import Button from "@calcom/ui/Button";
import { getLayout } from "@calcom/ui/v2/core/layouts/AdminLayout";
import { List } from "@calcom/ui/v2/modules/List";
import DestinationCalendarSelector from "@calcom/ui/v2/modules/event-types/DestinationCalendarSelector";
import DisconnectIntegration from "@calcom/ui/v2/modules/integrations/DisconnectIntegration";
import IntegrationListItem from "@calcom/ui/v2/modules/integrations/IntegrationListItem";

import { QueryCell } from "@lib/QueryCell";

function CalendarsView() {
  const { t } = useLocale();

  const query = trpc.useQuery(["viewer.connectedCalendars"]);
  const mutation = trpc.useMutation("viewer.setDestinationCalendar");

  return (
    <QueryCell
      query={query}
      success={({ data }) => {
        return (
          <div>
            <div className="mt-4 rounded-md border-neutral-200 bg-white p-2 sm:mx-0 sm:p-10 md:border md:p-6 xl:mt-0">
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
            <List>
              {data.connectedCalendars.map((item) => (
                <Fragment key={item.credentialId}>
                  {item.calendars && (
                    <IntegrationListItem
                      slug={item.integration.slug}
                      title={item.integration.title}
                      logo={item.integration.logo}
                      description={item.primary?.externalId || "No external Id"}
                      actions={<DisconnectIntegration credentialId={item.credentialId} />}>
                      <p>Testing</p>
                      {/* {!fromOnboarding && (
                      <>
                        <p className="px-4 pt-4 text-sm text-neutral-500">{t("toggle_calendars_conflict")}</p>
                        <ul className="space-y-2 p-4">
                          {item.calendars.map((cal) => (
                            <CalendarSwitch
                              key={cal.externalId}
                              externalId={cal.externalId}
                              title={cal.name || "Nameless calendar"}
                              type={item.integration.type}
                              defaultSelected={cal.isSelected}
                            />
                          ))}
                        </ul>
                      </>
                    )} */}
                    </IntegrationListItem>
                  )}
                </Fragment>
              ))}
            </List>
          </div>
        );
      }}
    />
  );
}

CalendarsView.getLayout = getLayout;

export default CalendarsView;
