"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

export type ICalendarSwitchProps = {
  title: string;
  externalId: string;
  type: string;
  isChecked: boolean;
  name: string;
  isLastItemInList?: boolean;
  destination?: boolean;
  credentialId: number;
  delegationCredentialId: string | null;
  eventTypeId: number | null;
  disabled?: boolean;
  cacheUpdatedAt?: Date | null;
  googleChannelId?: string | null;
};

type UserCalendarSwitchProps = Omit<ICalendarSwitchProps, "eventTypeId">;

type EventCalendarSwitchProps = ICalendarSwitchProps & {
  eventTypeId: number;
};

const CalendarSwitch = (props: ICalendarSwitchProps) => {
  const {
    title,
    externalId,
    type,
    isChecked,
    name,
    credentialId,
    delegationCredentialId,
    eventTypeId,
    disabled,
  } = props;
  const [checkedInternal, setCheckedInternal] = useState(isChecked);
  const utils = trpc.useUtils();
  const { t } = useLocale();
  const mutation = useMutation({
    mutationFn: async ({ isOn }: { isOn: boolean }) => {
      const body = {
        integration: type,
        externalId: externalId,
        ...(delegationCredentialId && { delegationCredentialId }),
        // new URLSearchParams does not accept numbers
        credentialId: String(credentialId),
        ...(eventTypeId ? { eventTypeId: String(eventTypeId) } : {}),
      };

      if (isOn) {
        const res = await fetch("/api/availability/calendar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      } else {
        const res = await fetch(`/api/availability/calendar?${new URLSearchParams(body)}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Something went wrong");
        }
      }
    },
    async onSettled() {
      await utils.viewer.apps.integrations.invalidate();
      await utils.viewer.calendars.connectedCalendars.invalidate();
    },
    onError() {
      setCheckedInternal(false);
      showToast(`Something went wrong when toggling "${title}"`, "error");
    },
  });
  return (
    <div className={classNames("my-2 flex flex-row items-center")}>
      <div className="flex pl-2">
        <Switch
          id={externalId}
          checked={checkedInternal}
          disabled={disabled || mutation.isPending}
          onCheckedChange={async (isOn: boolean) => {
            setCheckedInternal(isOn);
            await mutation.mutate({ isOn });
          }}
        />
      </div>
      <div className="flex flex-1 items-center justify-between">
        <label
          className={classNames(
            "ml-3 break-all text-sm font-medium leading-5",
            disabled ? "cursor-not-allowed opacity-25" : "cursor-pointer"
          )}
          htmlFor={externalId}>
          {name}
        </label>
        {type === "google_calendar" && props.googleChannelId && (
          <Dropdown>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="icon" color="secondary" StartIcon="ellipsis" className="ml-2" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem className="focus:ring-muted">
                <div className="px-2 py-1">
                  <div className="text-sm font-medium text-gray-900">{t("cache_status")}</div>
                  <div className="text-xs text-gray-500">
                    {props.cacheUpdatedAt &&
                      t("last_updated", {
                        timestamp: new Intl.DateTimeFormat("en-US", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(props.cacheUpdatedAt)),
                        interpolation: { escapeValue: false },
                      })}
                  </div>
                </div>
              </DropdownMenuItem>
              {props.cacheUpdatedAt && (
                <DropdownMenuItem className="outline-none">
                  <DropdownItem
                    type="button"
                    color="destructive"
                    StartIcon="trash"
                    onClick={() => {
                      showToast(t("cache_deletion_placeholder"), "success");
                    }}>
                    {t("delete_cached_data")}
                  </DropdownItem>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </Dropdown>
        )}
      </div>
      {!!props.destination && (
        <span className="bg-subtle text-default ml-8 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-normal sm:ml-4">
          <Icon name="arrow-left" className="h-4 w-4" />
          {t("adding_events_to")}
        </span>
      )}
      {mutation.isPending && (
        <Icon name="rotate-cw" className="text-muted h-4 w-4 animate-spin ltr:ml-1 rtl:mr-1" />
      )}
    </div>
  );
};

export const UserCalendarSwitch = (props: UserCalendarSwitchProps) => {
  return <CalendarSwitch {...props} eventTypeId={null} />;
};

export const EventCalendarSwitch = (props: EventCalendarSwitchProps) => {
  return <CalendarSwitch {...props} />;
};

export { CalendarSwitch };
