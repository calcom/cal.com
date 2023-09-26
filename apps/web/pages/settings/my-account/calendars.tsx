import { Trans } from "next-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState, useEffect } from "react";

import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import DestinationCalendarSelector from "@calcom/features/calendars/DestinationCalendarSelector";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { classNames } from "@calcom/lib";
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
import { Plus, Calendar } from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";

import PageWrapper from "@components/PageWrapper";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="border-subtle mt-8 space-y-6 rounded-xl border px-4 py-6 sm:px-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />

        <SkeletonButton className="ml-auto h-8 w-20 rounded-md p-5" />
      </div>
    </SkeletonContainer>
  );
};

const AddCalendarButton = () => {
  const { t } = useLocale();

  return (
    <>
      <Button color="secondary" StartIcon={Plus} href="/apps/categories/calendar">
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

  const [selectedDestinationCalendarOption, setSelectedDestinationCalendar] = useState<{
    integration: string;
    externalId: string;
  } | null>(null);

  useEffect(() => {
    if (query?.data?.destinationCalendar) {
      setSelectedDestinationCalendar({
        integration: query.data.destinationCalendar.integration,
        externalId: query.data.destinationCalendar.externalId,
      });
    }
  }, [query?.isLoading, query?.data?.destinationCalendar]);

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
      <Meta
        title={t("calendars")}
        description={t("calendars_description")}
        CTA={<AddCalendarButton />}
        borderInShellHeader={false}
      />
      <QueryCell
        query={query}
        customLoader={<SkeletonLoader />}
        success={({ data }) => {
          const isDestinationUpdateBtnDisabled =
            selectedDestinationCalendarOption?.externalId === query?.data?.destinationCalendar?.externalId;
          return data.connectedCalendars.length ? (
            <div>
              <div className="border-subtle mt-8 rounded-t-xl border px-4 py-6 sm:px-6">
                <h2 className="text-emphasis mb-1 text-base font-bold leading-5 tracking-wide">
                  {t("add_to_calendar")}
                </h2>
                <p className="text-default text-sm">{t("add_to_calendar_description")}</p>
              </div>
              <div className="border-subtle flex w-full flex-col space-y-3 border border-x border-y-0 px-4 py-6 sm:px-6">
                <DestinationCalendarSelector
                  hidePlaceholder
                  value={selectedDestinationCalendarOption?.externalId}
                  onChange={(option) => {
                    setSelectedDestinationCalendar(option);
                  }}
                  isLoading={mutation.isLoading}
                />
              </div>
              <SectionBottomActions align="end">
                <Button
                  loading={mutation.isLoading}
                  disabled={isDestinationUpdateBtnDisabled}
                  color="primary"
                  onClick={() => {
                    if (selectedDestinationCalendarOption) mutation.mutate(selectedDestinationCalendarOption);
                  }}>
                  {t("update")}
                </Button>
              </SectionBottomActions>

              <div className="border-subtle mt-8 rounded-t-xl border px-4 py-6 sm:px-6">
                <h4 className="text-emphasis text-base font-semibold leading-5">
                  {t("check_for_conflicts")}
                </h4>
                <p className="text-default pb-2 text-sm leading-5">{t("select_calendars")}</p>
              </div>

              <List
                className="border-subtle flex flex-col gap-6 rounded-b-xl border border-t-0 p-6"
                noBorderTreatment>
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
                                className: "border border-default py-[2px]",
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
                                className={classNames(
                                  "h-10 w-10",
                                  item.integration.logo.includes("-dark") && "dark:invert"
                                )}
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
                              buttonProps={{ className: "border border-default" }}
                            />
                          </div>
                        </div>
                        <div className="border-subtle w-full border-t">
                          <p className="text-subtle px-2 pt-4 text-sm">{t("toggle_calendars_conflict")}</p>
                          <ul className="space-y-4 p-4">
                            {item.calendars.map((cal) => (
                              <CalendarSwitch
                                key={cal.externalId}
                                credentialId={cal.credentialId}
                                externalId={cal.externalId}
                                title={cal.name || "Nameless calendar"}
                                name={cal.name || "Nameless calendar"}
                                type={item.integration.type}
                                isChecked={
                                  cal.isSelected || cal.externalId === data?.destinationCalendar?.externalId
                                }
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
              Icon={Calendar}
              headline={t("no_calendar_installed")}
              description={t("no_calendar_installed_description")}
              buttonText={t("add_a_calendar")}
              buttonOnClick={() => router.push("/apps/categories/calendar")}
              className="mt-6"
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
CalendarsView.PageWrapper = PageWrapper;

export default CalendarsView;
