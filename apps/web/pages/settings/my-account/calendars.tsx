import { Trans } from "next-i18next";
import { useRouter } from "next/router";
import { Fragment } from "react";

import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Alert,
  Badge,
  Button,
  EmptyScreen,
  List,
  ListItem,
  Meta,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  showToast,
} from "@calcom/ui";
import { FiPlus, FiCalendar } from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";

import { CalendarSwitch } from "@components/settings/CalendarSwitch";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="mt-6 mb-8 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="mr-6 h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

const AddCalendarButton = () => {
  const { t } = useLocale();

  return (
    <>
      <Button color="secondary" StartIcon={FiPlus} href="/apps/categories/calendar">
        {t("add_calendar")}
      </Button>
    </>
  );
};

const CalendarsView = () => {
  const { t } = useLocale();
  const router = useRouter();

  const utils = trpc.useContext();

  const query = trpc.viewer.connectedCalendars.useQuery();
  const mutation = trpc.viewer.setDestinationCalendar.useMutation({
    async onSettled() {
      await utils.viewer.connectedCalendars.invalidate();
    },
    onSuccess: async () => {
      showToast(t("calendar_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("unexpected_error_try_again"), "error");
    },
  });

  return (
    <>
      <Meta title={t("calendars")} description={t("calendars_description")} CTA={<AddCalendarButton />} />
      <QueryCell
        query={query}
        customLoader={<SkeletonLoader />}
        success={({ data }) => {
          return data.connectedCalendars.length ? (
            <div>
              <div className="mt-4 flex space-x-4 rounded-md border-gray-200 bg-gray-50 p-2 sm:mx-0 sm:p-10 md:border md:p-6 xl:mt-0">
                <div className=" flex h-9 w-9 items-center justify-center rounded-md border-2 border-gray-200 bg-white p-[6px]">
                  <FiCalendar className="h-6 w-6" />
                </div>

                <div className="flex w-full flex-col space-y-3">
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
                    {item.error && item.error.message && (
                      <Alert
                        severity="warning"
                        key={item.credentialId}
                        title={t("calendar_connection_fail")}
                        message={item.error.message}
                        className="mb-4 mt-4"
                        actions={
                          <>
                            {/* @TODO: add a reconnect button, that calls add api and delete old credential */}
                            <DisconnectIntegration
                              credentialId={item.credentialId}
                              trashIcon
                              onSuccess={() => query.refetch()}
                              buttonProps={{
                                className: "border border-gray-300 py-[2px]",
                                color: "secondary",
                              }}
                            />
                          </>
                        }
                      />
                    )}
                    {item?.error === undefined && item.calendars && (
                      <ListItem
                        leftNode={
                          item.integration.logo && (
                            <img src={item.integration.logo} alt={item.integration.title} />
                          )
                        }
                        heading={item.integration.name || item.integration.title || "Unknown Calendar"}
                        subHeading={item.integration.description}
                        badgePosition="heading"
                        badges={
                          <>
                            {data?.destinationCalendar?.credentialId === item.credentialId && (
                              <Badge variant="green">Default</Badge>
                            )}
                          </>
                        }
                        actions={
                          <>
                            <DisconnectIntegration
                              trashIcon
                              credentialId={item.credentialId}
                              buttonProps={{ className: "border border-gray-300" }}
                            />
                          </>
                        }
                        expanded={
                          <div className="w-full">
                            <p className="px-2 pt-4 text-sm text-gray-500">
                              {t("toggle_calendars_conflict")}
                            </p>
                            <ul className="space-y-2 p-4">
                              {item.calendars.map((cal) => (
                                <CalendarSwitch
                                  key={cal.externalId}
                                  externalId={cal.externalId}
                                  title={cal.name || "Nameless calendar"}
                                  type={item.integration.type}
                                  isSelected={cal.isSelected}
                                  defaultSelected={cal.externalId === data?.destinationCalendar?.externalId}
                                />
                              ))}
                            </ul>
                          </div>
                        }
                      />
                    )}
                  </Fragment>
                ))}
              </List>
            </div>
          ) : (
            <EmptyScreen
              Icon={FiCalendar}
              headline={t("no_calendar_installed")}
              description={t("no_calendar_installed_description")}
              buttonText={t("add_a_calendar")}
              buttonOnClick={() => router.push("/apps/categories/calendar")}
            />
          );
        }}
        error={() => {
          return (
            <Alert
              message={
                <Trans i18nKey="fetching_calendars_error">
                  An error ocurred while fetching your Calendars.
                  <a className="cursor-pointer underline" onClick={() => query.refetch()}>
                    try again
                  </a>
                  .
                </Trans>
              }
              severity="error"
            />
          );
        }}
      />
    </>
  );
};

CalendarsView.getLayout = getLayout;

export default CalendarsView;
