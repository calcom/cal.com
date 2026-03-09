import Link from "next/link";
import React from "react";

import AppListCard from "@calcom/features/apps/components/AppListCard";
import CredentialActionsDropdown from "@calcom/features/apps/components/CredentialActionsDropdown";
import AdditionalCalendarSelector from "@calcom/features/calendars/AdditionalCalendarSelector";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { Select, Switch } from "@calcom/ui/components/form";
import { List } from "@calcom/ui/components/list";
import { showToast } from "@calcom/ui/components/toast";

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

const ConnectedCalendarList = ({
  fromOnboarding = false,
  scope,
  items,
  disableConnectionModification,
  eventTypeId,
  onChanged,
  destinationCalendarId,
  isDisabled,
}: {
  fromOnboarding?: boolean;
  scope: SelectedCalendarSettingsScope;
  items: RouterOutputs["viewer"]["calendars"]["connectedCalendars"]["connectedCalendars"];
  disableConnectionModification?: boolean;
  eventTypeId: number | null;
  onChanged?: () => unknown | Promise<unknown>;
  destinationCalendarId?: string;
  isDisabled: boolean;
}) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const shouldUseEventTypeScope = scope === SelectedCalendarSettingsScope.EventType;
  const toggleCalendarSync = trpc.viewer.unifiedCalendar.toggleCalendarSync.useMutation();
  const [pendingSyncKeys, setPendingSyncKeys] = React.useState<Record<string, boolean>>({});
  const [syncStateByKey, setSyncStateByKey] = React.useState<Record<string, boolean>>({});

  const buildSyncKey = React.useCallback((credentialId: number | null, externalId: string) => {
    return `${credentialId ?? "na"}:${externalId}`;
  }, []);

  React.useEffect(() => {
    const initialSyncState: Record<string, boolean> = {};
    for (const connectedCalendar of items) {
      for (const cal of connectedCalendar.calendars ?? []) {
        const syncKey = buildSyncKey(cal.credentialId, cal.externalId);
        const syncEnabled = "syncEnabled" in cal ? Boolean(cal.syncEnabled) : false;
        initialSyncState[syncKey] = syncEnabled;
      }
    }
    setSyncStateByKey(initialSyncState);
  }, [items, buildSyncKey]);

  const getSyncProvider = React.useCallback(
    (input: { integrationType: string; syncProvider: unknown }): "GOOGLE" | "OUTLOOK" | null => {
      if (input.syncProvider === "GOOGLE" || input.syncProvider === "OUTLOOK") {
        return input.syncProvider;
      }
      const normalized = input.integrationType.toLowerCase();
      if (normalized.includes("google")) {
        return "GOOGLE";
      }
      if (
        normalized.includes("office365") ||
        normalized.includes("outlook") ||
        normalized.includes("microsoft")
      ) {
        return "OUTLOOK";
      }
      return null;
    },
    []
  );

  const setSyncPending = React.useCallback((syncKey: string, pending: boolean) => {
    setPendingSyncKeys((prev) => {
      if (pending) {
        return { ...prev, [syncKey]: true };
      }
      const next = { ...prev };
      delete next[syncKey];
      return next;
    });
  }, []);

  return (
    <List noBorderTreatment className="p-6 pt-2">
      {items.map((connectedCalendar) => {
        if (!!connectedCalendar.calendars && connectedCalendar.calendars.length > 0) {
          return (
            <AppListCard
              key={`list-${connectedCalendar.credentialId}-${scope}`}
              shouldHighlight
              slug={connectedCalendar.integration.slug}
              title={connectedCalendar.integration.name}
              logo={connectedCalendar.integration.logo}
              description={connectedCalendar.primary?.email ?? connectedCalendar.integration.description}
              className="bg-muted border-subtle mt-4 rounded-lg border pb-4"
              actions={
                <div className="flex w-32 justify-end">
                  <CredentialActionsDropdown
                    credentialId={connectedCalendar.credentialId}
                    integrationType={connectedCalendar.integration.type}
                    cacheUpdatedAt={connectedCalendar.cacheUpdatedAt}
                    onSuccess={onChanged}
                    delegationCredentialId={connectedCalendar.delegationCredentialId}
                    disableConnectionModification={disableConnectionModification}
                  />
                </div>
              }>
              <div className="border-subtle">
                {!fromOnboarding && (
                  <>
                    <p className="text-subtle px-5 text-xs font-medium">{t("toggle_calendars_conflict")}</p>
                    <ul className="space-y-4 px-5 ">
                      {connectedCalendar.calendars?.map((cal) => {
                        const syncKey = buildSyncKey(cal.credentialId, cal.externalId);
                        const syncEnabled =
                          syncStateByKey[syncKey] ??
                          ("syncEnabled" in cal ? Boolean(cal.syncEnabled) : false);
                        const syncProvider = getSyncProvider({
                          integrationType: connectedCalendar.integration.type,
                          syncProvider: "syncProvider" in cal ? cal.syncProvider : null,
                        });
                        const syncToggleDisabled =
                          isDisabled ||
                          Boolean(pendingSyncKeys[syncKey]) ||
                          !syncProvider ||
                          typeof cal.credentialId !== "number" ||
                          cal.credentialId <= 0;
                        return (
                          <div key={cal.externalId} className="flex items-center justify-between gap-4">
                            <CalendarSwitch
                              disabled={isDisabled}
                              externalId={cal.externalId}
                              title={cal.name || "Nameless calendar"}
                              name={cal.name || "Nameless calendar"}
                              type={connectedCalendar.integration.type}
                              isChecked={cal.isSelected}
                              destination={cal.externalId === destinationCalendarId}
                              credentialId={cal.credentialId}
                              eventTypeId={shouldUseEventTypeScope ? eventTypeId : null}
                              delegationCredentialId={connectedCalendar.delegationCredentialId || null}
                            />
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-subtle text-xs font-medium">Sync</span>
                              <Switch
                                checked={syncEnabled}
                                disabled={syncToggleDisabled}
                                onCheckedChange={async (checked) => {
                                  if (!syncProvider || typeof cal.credentialId !== "number") {
                                    showToast("Failed to update calendar sync. Please try again.", "error");
                                    return;
                                  }

                                  const previousValue = syncEnabled;
                                  setSyncStateByKey((prev) => ({
                                    ...prev,
                                    [syncKey]: checked,
                                  }));
                                  setSyncPending(syncKey, true);

                                  try {
                                    await toggleCalendarSync.mutateAsync({
                                      provider: syncProvider,
                                      credentialId: cal.credentialId,
                                      providerCalendarId: cal.externalId,
                                      enabled: checked,
                                    });

                                    showToast(
                                      checked ? t("enable_calendar_sync") : t("disable_calendar_sync"),
                                      "success"
                                    );
                                    await utils.viewer.calendars.connectedCalendars.invalidate();
                                  } catch (error) {
                                    setSyncStateByKey((prev) => ({
                                      ...prev,
                                      [syncKey]: previousValue,
                                    }));
                                    showToast("Failed to update calendar sync. Please try again.", "error");
                                    void error;
                                  } finally {
                                    setSyncPending(syncKey, false);
                                  }
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
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
                <CredentialActionsDropdown
                  credentialId={connectedCalendar.credentialId}
                  integrationType={connectedCalendar.integration.type}
                  cacheUpdatedAt={connectedCalendar.cacheUpdatedAt}
                  onSuccess={onChanged}
                  delegationCredentialId={connectedCalendar.delegationCredentialId}
                  disableConnectionModification={disableConnectionModification}
                />
              </div>
            }
          />
        );
      })}
    </List>
  );
};

export const SelectedCalendarsSettingsWebWrapper = (props: SelectedCalendarsSettingsWebWrapperProps) => {
  const {
    scope = SelectedCalendarSettingsScope.User,
    setScope = () => {
      return;
    },
    disabledScope,
    disableConnectionModification,
    eventTypeId = null,
  } = props;

  const query = trpc.viewer.calendars.connectedCalendars.useQuery(
    {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      eventTypeId: scope === SelectedCalendarSettingsScope.EventType ? eventTypeId! : null,
    },
    {
      suspense: true,
      refetchOnWindowFocus: false,
    }
  );

  const { isPending } = props;
  const showScopeSelector = !!props.eventTypeId;
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
        {query.data?.connectedCalendars && query.data?.connectedCalendars.length > 0 ? (
          <ConnectedCalendarList
            fromOnboarding={props.fromOnboarding}
            scope={scope}
            disableConnectionModification={disableConnectionModification}
            onChanged={props.onChanged}
            eventTypeId={eventTypeId}
            items={query.data.connectedCalendars}
            isDisabled={isDisabled}
          />
        ) : null}
      </SelectedCalendarsSettings>
    </div>
  );
};

export const SelectedCalendarsSettingsWebWrapperSkeleton = () => {
  return (
    <div className="border-default mt-6 rounded-md border">
      <div className="border-default border-b p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="bg-emphasis h-4 w-32 animate-pulse rounded-md" />
            <div className="bg-emphasis mt-2 h-4 w-48 animate-pulse rounded-md" />
          </div>
          <div className="bg-emphasis h-8 w-32 animate-pulse rounded-md" />
        </div>
      </div>
      <div className="p-6 pt-2">
        <div className="border-subtle mt-4 rounded-lg border p-4">
          <div className="flex items-center">
            <div className="bg-emphasis h-10 w-10 animate-pulse rounded-md" />
            <div className="ml-4 space-y-2">
              <div className="bg-emphasis h-4 w-32 animate-pulse rounded-md" />
              <div className="bg-emphasis h-4 w-48 animate-pulse rounded-md" />
            </div>
          </div>
          <div className="border-subtle mt-4 space-y-4 border-t pt-4">
            <div className="bg-emphasis h-4 w-64 animate-pulse rounded-md" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="bg-emphasis h-4 w-48 animate-pulse rounded-md" />
                  <div className="bg-emphasis h-6 w-10 animate-pulse rounded-md" />
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
    <div className="border-subtle px-6 pt-6 ">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-default text-base font-semibold leading-5">{t("check_for_conflicts")}</h4>
          <p className="text-subtle mt-6 text-sm leading-tight">{t("select_calendars")}</p>
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
        <div className="flex flex-row items-center space-x-2">
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
