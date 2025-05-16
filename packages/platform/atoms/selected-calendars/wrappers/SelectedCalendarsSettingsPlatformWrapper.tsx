import { useState } from "react";

import type { ICalendarSwitchProps } from "@calcom/features/calendars/CalendarSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { CALENDARS } from "@calcom/platform-constants";
import { QueryCell } from "@calcom/trpc/components/QueryCell";
import { Alert } from "@calcom/ui/components/alert";
import { AppListCard } from "@calcom/ui/components/app-list-card";
import type { ButtonProps } from "@calcom/ui/components/button";
import { Button } from "@calcom/ui/components/button";
import { CalendarSwitchComponent } from "@calcom/ui/components/calendar-switch";
import { DisconnectIntegrationComponent } from "@calcom/ui/components/disconnect-calendar-integration";
import { Dropdown, DropdownMenuContent, DropdownMenuTrigger } from "@calcom/ui/components/dropdown";
import { Switch } from "@calcom/ui/components/form";
import { List } from "@calcom/ui/components/list";

import { AppleConnect } from "../../connect/apple/AppleConnect";
import { useAddSelectedCalendar } from "../../hooks/calendars/useAddSelectedCalendar";
import { useDeleteCalendarCredentials } from "../../hooks/calendars/useDeleteCalendarCredentials";
import { useRemoveSelectedCalendar } from "../../hooks/calendars/useRemoveSelectedCalendar";
import { useConnectedCalendars } from "../../hooks/useConnectedCalendars";
import { Connect } from "../../index";
import { AtomsWrapper } from "../../src/components/atoms-wrapper";
import { useToast } from "../../src/components/ui/use-toast";
import { SelectedCalendarsSettings } from "../SelectedCalendarsSettings";

export type CalendarRedirectUrls = {
  google?: string;
  outlook?: string;
};

type SelectedCalendarsSettingsPlatformWrapperProps = {
  classNames?: string;
  calendarRedirectUrls?: CalendarRedirectUrls;
  allowDelete?: boolean;
  isDryRun?: boolean;
};

export const SelectedCalendarsSettingsPlatformWrapper = ({
  classNames = "mx-5 mb-6",
  calendarRedirectUrls,
  allowDelete,
  isDryRun,
}: SelectedCalendarsSettingsPlatformWrapperProps) => {
  const { t } = useLocale();
  const query = useConnectedCalendars({});

  return (
    <AtomsWrapper>
      <div>
        <QueryCell
          query={query}
          success={({ data }) => {
            const destinationCalendarId = data.destinationCalendar.externalId;

            if (!data.connectedCalendars.length) {
              return (
                <SelectedCalendarsSettings classNames={classNames}>
                  <SelectedCalendarsSettingsHeading
                    calendarRedirectUrls={calendarRedirectUrls}
                    isDryRun={isDryRun}
                  />
                  <h1 className="px-6 py-4 text-base leading-5">No connected calendars found.</h1>
                </SelectedCalendarsSettings>
              );
            }

            return (
              <SelectedCalendarsSettings classNames={classNames}>
                <SelectedCalendarsSettingsHeading
                  calendarRedirectUrls={calendarRedirectUrls}
                  isDryRun={isDryRun}
                />
                <List noBorderTreatment className="p-6 pt-2">
                  {data.connectedCalendars.map((connectedCalendar) => {
                    if (!!connectedCalendar.calendars && connectedCalendar.calendars.length > 0) {
                      return (
                        <AppListCard
                          key={`list-${connectedCalendar.credentialId}-${connectedCalendar.integration.slug}`}
                          shouldHighlight
                          slug={connectedCalendar.integration.slug}
                          title={connectedCalendar.integration.name}
                          logo={`https://app.cal.com${connectedCalendar.integration.logo}`}
                          description={
                            connectedCalendar.primary?.email ?? connectedCalendar.integration.description
                          }
                          className="border-subtle mt-4 rounded-lg border"
                          actions={
                            <div className="flex w-32 justify-end">
                              {allowDelete && !connectedCalendar.delegationCredentialId && (
                                <PlatformDisconnectIntegration
                                  credentialId={connectedCalendar.credentialId}
                                  trashIcon
                                  buttonProps={{ className: "border border-default" }}
                                  slug={connectedCalendar.integration.slug}
                                  isDryRun={isDryRun}
                                />
                              )}
                            </div>
                          }>
                          <div className="border-subtle border-t">
                            <p className="text-subtle px-5 pt-4 text-sm">{t("toggle_calendars_conflict")}</p>
                            <ul className="space-y-4 px-5 py-4">
                              {connectedCalendar.calendars?.map((cal) => {
                                return (
                                  <PlatformCalendarSwitch
                                    key={cal.externalId}
                                    externalId={cal.externalId}
                                    title={cal.name || "Nameless calendar"}
                                    name={cal.name || "Nameless calendar"}
                                    type={connectedCalendar.integration.type}
                                    isChecked={cal.isSelected}
                                    destination={cal.externalId === destinationCalendarId}
                                    credentialId={cal.credentialId}
                                    delegationCredentialId={connectedCalendar.delegationCredentialId}
                                    eventTypeId={null}
                                    isDryRun={isDryRun}
                                  />
                                );
                              })}
                            </ul>
                          </div>
                        </AppListCard>
                      );
                    }
                    return (
                      <Alert
                        key={`alert-${connectedCalendar.credentialId}`}
                        severity="warning"
                        title={t("something_went_wrong")}
                        message={<span>{connectedCalendar.error?.message || t("calendar_error")}</span>}
                        iconClassName="h-10 w-10 ml-2 mr-1 mt-0.5"
                        actions={
                          !Boolean(connectedCalendar.delegationCredentialId) && (
                            <div className="flex w-32 justify-end">
                              <PlatformDisconnectIntegration
                                credentialId={connectedCalendar.credentialId}
                                trashIcon
                                buttonProps={{ className: "border border-default" }}
                                slug={connectedCalendar.integration.slug}
                                isDryRun={isDryRun}
                              />
                            </div>
                          )
                        }
                      />
                    );
                  })}
                </List>
              </SelectedCalendarsSettings>
            );
          }}
        />
      </div>
    </AtomsWrapper>
  );
};

const SelectedCalendarsSettingsHeading = ({
  calendarRedirectUrls,
  isDryRun,
}: {
  calendarRedirectUrls?: CalendarRedirectUrls;
  isDryRun?: boolean;
}) => {
  const { t } = useLocale();

  return (
    <div className="border-subtle border-b p-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-emphasis text-base font-semibold leading-5">{t("check_for_conflicts")}</h4>
          <p className="text-default text-sm leading-tight">{t("select_calendars")}</p>
        </div>
        <div className="flex flex-col xl:flex-row xl:space-x-5">
          <div className="flex items-center">
            <PlatformAdditionalCalendarSelector
              calendarRedirectUrls={calendarRedirectUrls}
              isDryRun={isDryRun}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const PlatformDisconnectIntegration = (props: {
  credentialId: number;
  label?: string;
  slug?: string;
  trashIcon?: boolean;
  isGlobal?: boolean;
  onSuccess?: () => void;
  buttonProps?: ButtonProps;
  isDryRun?: boolean;
}) => {
  const { t } = useLocale();
  const { onSuccess, credentialId, slug } = props;

  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const { mutate: deleteCalendarCredentials } = useDeleteCalendarCredentials({
    onSuccess: () => {
      toast({
        description: t("app_removed_successfully"),
      });
      setModalOpen(false);
      onSuccess && onSuccess();
    },
    onError: () => {
      toast({
        description: t("error_removing_app"),
      });
      setModalOpen(false);
    },
  });

  return (
    <DisconnectIntegrationComponent
      onDeletionConfirmation={async () => {
        !props.isDryRun && setModalOpen(false);

        if (props.isDryRun) {
          toast({
            description: t("app_removed_successfully"),
          });
        }

        if (!props.isDryRun && slug) {
          await deleteCalendarCredentials({
            calendar: slug.split("-")[0] as unknown as (typeof CALENDARS)[number],
            id: credentialId,
          });
        }
      }}
      {...props}
      isModalOpen={modalOpen}
      onModalOpen={() => setModalOpen((prevValue) => !prevValue)}
    />
  );
};

const PlatformCalendarSwitch = (props: ICalendarSwitchProps & { isDryRun?: boolean }) => {
  const { isChecked, title, credentialId, type, externalId, delegationCredentialId } = props;
  const [checkedInternal, setCheckedInternal] = useState(isChecked);
  const { toast } = useToast();

  const { mutate: addSelectedCalendar, isPending: isAddingSelectedCalendar } = useAddSelectedCalendar({
    onError: (err) => {
      toast({
        description: `Something went wrong while adding calendar - ${title}. ${err}`,
      });
    },
  });
  const { mutate: removeSelectedCalendar, isPending: isRemovingSelectedCalendar } = useRemoveSelectedCalendar(
    {
      onError: (err) => {
        toast({
          description: `Something went wrong while removing calendar - ${title}. ${err}`,
        });
      },
    }
  );

  const toggleSelectedCalendars = async ({
    isOn,
    credentialId,
    integration,
    externalId,
  }: {
    isOn: boolean;
    credentialId: number;
    integration: string;
    externalId: string;
  }) => {
    if (isOn) {
      await addSelectedCalendar({ credentialId, integration, externalId, delegationCredentialId });
    } else {
      await removeSelectedCalendar({
        credentialId,
        integration,
        externalId,
        delegationCredentialId,
      });
    }
  };

  return (
    <CalendarSwitchComponent
      destination={props.destination}
      {...props}
      isChecked={checkedInternal}
      isLoading={isAddingSelectedCalendar || isRemovingSelectedCalendar}>
      <Switch
        checked={checkedInternal}
        id={externalId}
        onCheckedChange={async () => {
          setCheckedInternal((prevValue) => !prevValue);

          if (!props.isDryRun) {
            await toggleSelectedCalendars({
              isOn: !checkedInternal,
              credentialId,
              externalId,
              integration: type,
            });
          }
        }}
      />
    </CalendarSwitchComponent>
  );
};

const PlatformAdditionalCalendarSelector = ({
  calendarRedirectUrls,
  isDryRun,
}: {
  calendarRedirectUrls?: CalendarRedirectUrls;
  isDryRun?: boolean;
}) => {
  const { t } = useLocale();
  const { refetch } = useConnectedCalendars({});

  return (
    <Dropdown modal={false}>
      <DropdownMenuTrigger asChild>
        <Button StartIcon="plus" color="secondary" className="md:rounded-md">
          {t("add")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto">
        <div>
          <div>
            <Connect.GoogleCalendar
              isDryRun={isDryRun}
              isMultiCalendar={true}
              isClickable={true}
              tooltip={<></>}
              redir={calendarRedirectUrls?.google ?? window.location.href}
              label={t("add_calendar_label", { calendar: "Google" })}
              loadingLabel={t("add_calendar_label", { calendar: "Google" })}
              alreadyConnectedLabel={t("add_calendar_label", { calendar: "Google" })}
              className="hover:bg-subtle hover:text-default cursor-pointer border-none bg-inherit text-inherit md:rounded-md"
            />
          </div>
          <div>
            <Connect.OutlookCalendar
              isDryRun={isDryRun}
              isMultiCalendar={true}
              isClickable={true}
              tooltip={<></>}
              redir={calendarRedirectUrls?.outlook ?? window.location.href}
              label={t("add_calendar_label", { calendar: "Outlook" })}
              loadingLabel={t("add_calendar_label", { calendar: "Outlook" })}
              alreadyConnectedLabel={t("add_calendar_label", { calendar: "Outlook" })}
              className="hover:bg-subtle hover:text-default cursor-pointer border-none bg-inherit text-inherit md:rounded-md"
            />
          </div>
          <div>
            <AppleConnect
              isDryRun={isDryRun}
              onSuccess={refetch}
              isClickable={true}
              isMultiCalendar={true}
              tooltip={<></>}
              label={t("add_calendar_label", { calendar: "Apple" })}
              loadingLabel={t("add_calendar_label", { calendar: "Apple" })}
              alreadyConnectedLabel={t("add_calendar_label", { calendar: "Apple" })}
              className="hover:bg-subtle hover:text-default cursor-pointer border-none bg-inherit text-inherit md:rounded-md"
            />
          </div>
        </div>
      </DropdownMenuContent>
    </Dropdown>
  );
};
