import Link from "next/link";
import React from "react";

import AppListCard from "@calcom/features/apps/components/AppListCard";
import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { QueryCell } from "@calcom/trpc/components/QueryCell";
import { trpc } from "@calcom/trpc/react";
import { Alert, Select, List } from "@calcom/ui";
import AdditionalCalendarSelector from "@calcom/web/components/apps/AdditionalCalendarSelector";

import { SelectedCalendarsSettings } from "../SelectedCalendarsSettings";

export enum SelectedCalendarSettingsScope {
  User = "user",
  EventType = "eventType",
}

type SelectedCalendarsSettingsWebWrapperProps = {
  onChanged?: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
  isPending?: boolean;
  classNames?: string;
  eventTypeId?: number;
  disabledScope?: SelectedCalendarSettingsScope;
  scope?: SelectedCalendarSettingsScope;
  setScope?: (scope: SelectedCalendarSettingsScope) => void;
  disableConnectionModification?: boolean;
};

export const SelectedCalendarsSettingsWebWrapper = (props: SelectedCalendarsSettingsWebWrapperProps) => {
  const { t } = useLocale();
  const {
    scope = SelectedCalendarSettingsScope.User,
    setScope = () => {
      return;
    },
    disabledScope,
    disableConnectionModification,
    eventTypeId = null,
  } = props;

  const query = trpc.viewer.connectedCalendars.useQuery(
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      eventTypeId: scope === SelectedCalendarSettingsScope.EventType ? eventTypeId! : null,
    },
    {
      suspense: true,
      refetchOnWindowFocus: false,
    }
  );
  const { fromOnboarding, isPending } = props;
  const showScopeSelector = !!props.eventTypeId;
  const shouldUseEventTypeScope = scope === SelectedCalendarSettingsScope.EventType;
  const isDisabled = disabledScope ? disabledScope === scope : false;
  const shouldDisableConnectionModification = isDisabled || disableConnectionModification;
  return (
    <div>
      <SelectedCalendarsSettings classNames={props.classNames}>
        <SelectedCalendarsSettingsHeading
          isConnectedCalendarsPresent={!!query.data?.connectedCalendars.length}
          isPending={isPending}
          showScopeSelector={showScopeSelector}
          setScope={setScope}
          scope={scope}
          shouldDisableConnectionModification={shouldDisableConnectionModification}
        />
        <QueryCell
          query={query}
          success={({ data }) => {
            if (!data.connectedCalendars.length) {
              return null;
            }

            return (
              <List noBorderTreatment className="p-6 pt-2">
                {data.connectedCalendars.map((connectedCalendar) => {
                  if (!!connectedCalendar.calendars && connectedCalendar.calendars.length > 0) {
                    return (
                      <AppListCard
                        key={`list-${connectedCalendar.credentialId}-${scope}`}
                        shouldHighlight
                        slug={connectedCalendar.integration.slug}
                        title={connectedCalendar.integration.name}
                        logo={connectedCalendar.integration.logo}
                        description={
                          connectedCalendar.primary?.email ?? connectedCalendar.integration.description
                        }
                        className="border-subtle mt-4 rounded-lg border"
                        actions={
                          !disableConnectionModification && (
                            <div className="flex w-32 justify-end">
                              <DisconnectIntegration
                                credentialId={connectedCalendar.credentialId}
                                trashIcon
                                onSuccess={props.onChanged}
                                buttonProps={{ className: "border border-default" }}
                              />
                            </div>
                          )
                        }>
                        <div className="border-subtle border-t">
                          {!fromOnboarding && (
                            <>
                              <p className="text-subtle px-5 pt-4 text-sm">
                                {t("toggle_calendars_conflict")}
                              </p>
                              <ul className="space-y-4 px-5 py-4">
                                {connectedCalendar.calendars?.map((cal) => (
                                  <CalendarSwitch
                                    disabled={isDisabled}
                                    key={cal.externalId}
                                    externalId={cal.externalId}
                                    title={cal.name || "Nameless calendar"}
                                    name={cal.name || "Nameless calendar"}
                                    type={connectedCalendar.integration.type}
                                    isChecked={cal.isSelected}
                                    destination={cal.externalId === props.destinationCalendarId}
                                    credentialId={cal.credentialId}
                                    eventTypeId={shouldUseEventTypeScope ? eventTypeId : null}
                                  />
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </AppListCard>
                    );
                  }
                  return (
                    <Alert
                      key={`alert-${connectedCalendar.credentialId}`}
                      severity="warning"
                      title={t("something_went_wrong")}
                      message={
                        <span>
                          <Link href={`/apps/${connectedCalendar.integration.slug}`}>
                            {connectedCalendar.integration.name}
                          </Link>
                          : {t("calendar_error")}
                        </span>
                      }
                      iconClassName="h-10 w-10 ml-2 mr-1 mt-0.5"
                      actions={
                        <div className="flex w-32 justify-end">
                          <DisconnectIntegration
                            credentialId={connectedCalendar.credentialId}
                            trashIcon
                            onSuccess={props.onChanged}
                            buttonProps={{ className: "border border-default" }}
                          />
                        </div>
                      }
                    />
                  );
                })}
              </List>
            );
          }}
        />
      </SelectedCalendarsSettings>
    </div>
  );
};

export const SelectedCalendarsSettingsWebWrapperSkeleton = () => {
  return (
    <div className="border-subtle mt-6 rounded-lg border">
      <div className="border-subtle border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 w-32 animate-pulse rounded-md bg-gray-200" />
            <div className="mt-2 h-4 w-48 animate-pulse rounded-md bg-gray-200" />
          </div>
          <div className="h-8 w-32 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>
      <div className="p-6 pt-2">
        <div className="border-subtle mt-4 rounded-lg border p-4">
          <div className="flex items-center">
            <div className="h-10 w-10 animate-pulse rounded-md bg-gray-200" />
            <div className="ml-4 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded-md bg-gray-200" />
              <div className="h-4 w-48 animate-pulse rounded-md bg-gray-200" />
            </div>
          </div>
          <div className="border-subtle mt-4 space-y-4 border-t pt-4">
            <div className="h-4 w-64 animate-pulse rounded-md bg-gray-200" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-48 animate-pulse rounded-md bg-gray-200" />
                  <div className="h-6 w-10 animate-pulse rounded-md bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SelectedCalendarsSettingsHeading = (props: {
  isConnectedCalendarsPresent: boolean;
  isPending?: boolean;
  showScopeSelector: boolean;
  setScope: (scope: SelectedCalendarSettingsScope) => void;
  scope: SelectedCalendarSettingsScope;
  shouldDisableConnectionModification?: boolean;
}) => {
  const { t } = useLocale();
  const optionsToSwitchScope = [
    { label: "User", value: SelectedCalendarSettingsScope.User },
    { label: "Event Type", value: SelectedCalendarSettingsScope.EventType },
  ];
  const switchScopeSelectValue = optionsToSwitchScope.find((option) => option.value === props.scope);
  return (
    <div className="border-subtle border-b p-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-emphasis text-base font-semibold leading-5">{t("check_for_conflicts")}</h4>
          <p className="text-default text-sm leading-tight">{t("select_calendars")}</p>
        </div>

        {!props.shouldDisableConnectionModification && (
          <div className="flex flex-col xl:flex-row xl:space-x-5">
            {props.isConnectedCalendarsPresent && (
              <div className="flex items-center">
                <AdditionalCalendarSelector isPending={props.isPending} />
              </div>
            )}
          </div>
        )}
      </div>
      {props.showScopeSelector && (
        <div className="mt-2 flex flex-row items-center space-x-2">
          <span className="text-default text-sm">Using</span>
          <Select
            onChange={(option) => {
              if (!option) return;
              props.setScope(option.value);
            }}
            value={switchScopeSelectValue}
            options={optionsToSwitchScope}
          />
          <span className="text-default text-sm">settings</span>
        </div>
      )}
    </div>
  );
};
