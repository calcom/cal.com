import type { GetServerSidePropsContext } from "next";
import { Trans } from "next-i18next";
import Link from "next/link";
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
  ListItemText,
  ListItemTitle,
  Meta,
  SkeletonButton,
  SkeletonContainer,
  SkeletonText,
  showToast,
} from "@calcom/ui";
import { FiPlus, FiCalendar } from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";

import { CalendarSwitch } from "@components/settings/CalendarSwitch";

import { ssrInit } from "@server/lib/ssr";

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
              <List className="flex flex-col gap-6" noBorderTreatment>
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
                      <ListItem className="flex-col rounded-md">
                        <div className="flex w-full flex-1 items-center space-x-3 p-4 rtl:space-x-reverse">
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
                            <ListItemTitle component="h3" className="mb-1 space-x-2 rtl:space-x-reverse">
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
                              buttonProps={{ className: "border border-gray-300" }}
                            />
                          </div>
                        </div>
                        <div className="w-full border-t border-gray-200">
                          <p className="px-2 pt-4 text-sm text-gray-500">{t("toggle_calendars_conflict")}</p>
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
                      </ListItem>
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

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const ssr = await ssrInit(context);

  return {
    props: {
      trpcState: ssr.dehydrate(),
    },
  };
};

export default CalendarsView;
