"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import AppListCard from "@calcom/features/apps/components/AppListCard";
import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { CalendarSwitch } from "@calcom/features/calendars/CalendarSwitch";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { QueryCell } from "@calcom/trpc/components/QueryCell";
import { trpc } from "@calcom/trpc/react";
import { Alert, Select, Label, showToast } from "@calcom/ui";
import { List } from "@calcom/ui";
import AdditionalCalendarSelector from "@calcom/web/components/apps/AdditionalCalendarSelector";

import { SelectedCalendarsSettings } from "../SelectedCalendarsSettings";

type SelectedCalendarsSettingsWebWrapperProps = {
  onChanged: () => unknown | Promise<unknown>;
  fromOnboarding?: boolean;
  destinationCalendarId?: string;
  isPending?: boolean;
  classNames?: string;
};

const mappedReminders = [
  { value: 30, label: "30 mins" },
  { value: 15, label: "15 mins" },
  { value: 10, label: "10 mins" },
];

function ReminderSelection({
  credentialId,
  value,
  type,
  externalId,
}: {
  credentialId: number;
  type: string;
  value?: number;
  externalId: string;
}) {
  const [defaultReminder, setDefaultReminder] = useState<number>(value || 30);
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const mutation = useMutation({
    mutationFn: async ({ reminderValue }: { reminderValue: number }) => {
      const body = {
        integration: type,
        externalId: externalId,
        defaultReminder: reminderValue,
      };

      const res = await fetch("/api/availability/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, credentialId }),
      });
      if (!res.ok) {
        throw new Error("Something went wrong");
      }
    },
    async onSettled() {
      showToast(t("reminder_has_been_saved"), "success");
      await utils.viewer.integrations.invalidate();
      await utils.viewer.connectedCalendars.invalidate();
    },
    onError(e) {
      showToast(`Something went wrong when updating reminder${e}`, "error");
    },
  });

  return (
    <>
      <Label className="text-emphasis">
        <>Reminder</>
      </Label>
      <Select<{ label: string; value: number }>
        options={mappedReminders}
        className="w-32"
        value={mappedReminders.find((option) => option.value === defaultReminder)}
        onChange={(event) => {
          mutation.mutate({
            reminderValue: event?.value || 30,
          });
          setDefaultReminder(event?.value || 30);
        }}
        menuPortalTarget={document.body} // Render dropdown in the body
        menuPosition="absolute"
      />
    </>
  );
}
export const SelectedCalendarsSettingsWebWrapper = (props: SelectedCalendarsSettingsWebWrapperProps) => {
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
            <SelectedCalendarsSettings classNames={props.classNames}>
              <SelectedCalendarsSettingsHeading
                isConnectedCalendarsPresent={!!data.connectedCalendars.length}
                isPending={isPending}
              />
              <List noBorderTreatment className="p-6 pt-2">
                {data.connectedCalendars.map((connectedCalendar) => {
                  if (!!connectedCalendar.calendars && connectedCalendar.calendars.length > 0) {
                    return (
                      <AppListCard
                        key={`list-${connectedCalendar.credentialId}`}
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
                                {connectedCalendar.integration.type === "google_calendar" &&
                                  connectedCalendar.selectedCalendar && (
                                    <ReminderSelection
                                      credentialId={connectedCalendar.credentialId}
                                      type={connectedCalendar.integration.type}
                                      externalId={connectedCalendar.selectedCalendar.externalId}
                                      value={connectedCalendar.selectedCalendar.defaultReminder}
                                    />
                                  )}
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
            </SelectedCalendarsSettings>
          );
        }}
      />
    </div>
  );
};

const SelectedCalendarsSettingsHeading = (props: {
  isConnectedCalendarsPresent: boolean;
  isPending?: boolean;
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
