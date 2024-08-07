import Link from "next/link";
import React from "react";

import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import { QueryCell } from "@calcom/lib";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { List } from "@calcom/ui";
import AppListCard from "@calcom/web/components/AppListCard";
import AdditionalCalendarSelector from "@calcom/web/components/apps/AdditionalCalendarSelector";

import { CalendarSettings } from "../CalendarSettings";
import { ConnectedCalendarSettings } from "../ConnectedCalendarSettings";

type CalendarSettingsWebWrapperProps = {
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
  isPending?: boolean;
};

export const CalendarSettingsWebWrapper = (props: CalendarSettingsWebWrapperProps) => {
  const { t } = useLocale();
  const query = trpc.viewer.connectedCalendars.useQuery(undefined, {
    suspense: true,
    refetchOnWindowFocus: false,
  });
  const { fromOnboarding, isPending } = props;

  return (
    <div>
      <QueryCell
        query={query}
        success={({ data }) => {
          if (!data.connectedCalendars.length) {
            return null;
          }

          return (
            <div className="border-subtle mt-6 rounded-lg border">
              <CalendarSettings>
                <CalendarSettingsHeading
                  isConnectedCalendarsPresent={!!data.connectedCalendars.length}
                  isPending={isPending}
                />
                <List noBorderTreatment className="p-6 pt-2">
                  {data.connectedCalendars.map((connectedCalendar) => {
                    console.log(connectedCalendar.calendars, "each calendars of connected calendar");

                    return (
                      <ConnectedCalendarSettings
                        key={connectedCalendar.credentialId}
                        isConnectedCalendarPresent={!!connectedCalendar.calendars}
                        errorMessage={
                          <span>
                            <Link href={`/apps/${connectedCalendar.integration.slug}`}>
                              {connectedCalendar.integration.name}
                            </Link>
                            : {t("calendar_error")}
                          </span>
                        }
                        actions={
                          <div className="flex w-32 justify-end">
                            <DisconnectIntegration
                              credentialId={connectedCalendar.credentialId}
                              trashIcon
                              onSuccess={props.onChanged}
                              buttonProps={{ className: "border border-default" }}
                            />
                          </div>
                        }>
                        <AppListCard
                          shouldHighlight
                          slug={connectedCalendar.integration.slug}
                          title={connectedCalendar.integration.name}
                          logo={connectedCalendar.integration.logo}
                          description={
                            connectedCalendar.primary?.email ?? connectedCalendar.integration.description
                          }
                          className="border-subtle mt-4 rounded-lg border"
                          actions={
                            <div className="flex w-32 justify-end">
                              <DisconnectIntegration
                                credentialId={connectedCalendar.credentialId}
                                trashIcon
                                onSuccess={props.onChanged}
                                buttonProps={{ className: "border border-default" }}
                              />
                            </div>
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
                                      key={cal.externalId}
                                      externalId={cal.externalId}
                                      title={cal.name || "Nameless calendar"}
                                      name={cal.name || "Nameless calendar"}
                                      type={connectedCalendar.integration.type}
                                      isChecked={cal.isSelected}
                                      destination={cal.externalId === props.destinationCalendarId}
                                      credentialId={cal.credentialId}
                                    />
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        </AppListCard>
                      </ConnectedCalendarSettings>
                    );
                  })}
                </List>
              </CalendarSettings>
            </div>
          );
        }}
      />
    </div>
  );
};

const CalendarSettingsHeading = (props: { isConnectedCalendarsPresent: boolean; isPending?: boolean }) => {
  const { t } = useLocale();

  return (
    <div className="border-subtle border-b p-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-emphasis text-base font-semibold leading-5">{t("check_for_conflicts")}</h4>
          <p className="text-default text-sm leading-tight">{t("select_calendars")}</p>
        </div>
        <div className="flex flex-col xl:flex-row xl:space-x-5">
          {props.isConnectedCalendarsPresent && (
            <div className="flex items-center">
              <AdditionalCalendarSelector isPending={props.isPending} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
