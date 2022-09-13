import { Trans } from "next-i18next";
import Link from "next/link";
import { useRouter } from "next/router";
import { Fragment } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui";
import Badge from "@calcom/ui/v2/core/Badge";
import EmptyScreen from "@calcom/ui/v2/core/EmptyScreen";
import Meta from "@calcom/ui/v2/core/Meta";
import { getLayout } from "@calcom/ui/v2/core/layouts/SettingsLayout";
import { List, ListItem, ListItemText, ListItemTitle } from "@calcom/ui/v2/modules/List";
import DestinationCalendarSelector from "@calcom/ui/v2/modules/event-types/DestinationCalendarSelector";
import DisconnectIntegration from "@calcom/ui/v2/modules/integrations/DisconnectIntegration";

import { QueryCell } from "@lib/QueryCell";

import { CalendarSwitch } from "@components/v2/settings/CalendarSwitch";

const CalendarsView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const utils = trpc.useContext();

  const query = trpc.useQuery(["viewer.connectedCalendars"]);
  const mutation = trpc.useMutation("viewer.setDestinationCalendar", {
    async onSettled() {
      await utils.invalidateQueries(["viewer.connectedCalendars"]);
    },
  });

  return (
    <>
      <Meta title="Calendars" description="Configure how your event types interact with your calendars" />
      <QueryCell
        query={query}
        success={({ data }) => {
          return data.connectedCalendars.length ? (
            <div>
              <div className="mt-4 flex space-x-4 rounded-md border-gray-200 bg-gray-50 p-2 sm:mx-0 sm:p-10 md:border md:p-6 xl:mt-0">
                <div className=" flex h-9 w-9 items-center justify-center rounded-md border-2 border-gray-200 bg-white p-[6px]">
                  <Icon.FiCalendar className="h-6 w-6" />
                </div>

                <div className="flex flex-col space-y-3">
                  <div>
                    <h4 className=" pb-2 text-base font-semibold leading-5 text-black">
                      {t("add_to_calendar")}
                    </h4>
                    <p className=" text-sm leading-5 text-gray-600">
                      <Trans i18nKey="add_to_calendar_description">
                        Where to add events when you re booked. You can override this on a per-event basis in
                        advanced settings in the event type.
                      </Trans>
                    </p>
                  </div>
                  <DestinationCalendarSelector
                    hidePlaceholder
                    value={data.destinationCalendar?.externalId}
                    onChange={mutation.mutate}
                    isLoading={mutation.isLoading}
                  />
                </div>
              </div>

              <h4 className="mt-12 text-base font-semibold leading-5 text-black">
                {t("check_for_conflicts")}
              </h4>
              <p className="pb-2 text-sm leading-5 text-gray-600">{t("select_calendars")}</p>
              <List>
                {data.connectedCalendars.map((item) => (
                  <Fragment key={item.credentialId}>
                    {item.calendars && (
                      <ListItem expanded className="flex-col">
                        <div className="flex w-full flex-1 items-center space-x-3 pb-5 pl-1 pt-1 rtl:space-x-reverse">
                          {
                            // eslint-disable-next-line @next/next/no-img-element
                            item.integration.logo && (
                              <img
                                className="h-10 w-10"
                                src={item.integration.logo}
                                alt={item.integration.title}
                              />
                            )
                          }
                          <div className="flex-grow truncate pl-2">
                            <ListItemTitle component="h3" className="mb-1 space-x-2">
                              <Link href={"/apps/" + item.integration.slug}>
                                {item.integration.name || item.integration.title}
                              </Link>
                              {data?.destinationCalendar?.credentialId === item.credentialId && (
                                <Badge variant="green">Default</Badge>
                              )}
                            </ListItemTitle>
                            <ListItemText component="p">{item.integration.description}</ListItemText>
                          </div>
                          <div>
                            <DisconnectIntegration
                              trashIcon
                              credentialId={item.credentialId}
                              buttonProps={{ size: "icon", color: "secondary" }}
                            />
                          </div>
                        </div>
                        <div className="w-full border-t border-gray-200">
                          <p className="px-2 pt-4 text-sm text-neutral-500">
                            {t("toggle_calendars_conflict")}
                          </p>
                          <ul className="space-y-2 px-2 pt-4">
                            {item.calendars.map((cal) => (
                              <CalendarSwitch
                                key={cal.externalId}
                                externalId={cal.externalId}
                                title={cal.name || "Nameless calendar"}
                                type={item.integration.type}
                                defaultSelected={cal.externalId === data?.destinationCalendar?.externalId}
                              />
                            ))}
                          </ul>
                        </div>
                      </ListItem>
                    )}
                  </Fragment>
                ))}
              </List>
            </div>
          ) : (
            <EmptyScreen
              Icon={Icon.FiCalendar}
              headline="No calendar installed"
              description="You have not yet connected any of your calendars"
              buttonText="Add a calendar"
              buttonOnClick={() => router.push(`${WEBAPP_URL}/apps/categories/calendar`)}
            />
          );
        }}
      />
    </>
  );
};

CalendarsView.getLayout = getLayout;

export default CalendarsView;
