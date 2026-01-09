import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants/permissions";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

type OAuthClientFormProps = {
  defaultValues?: Partial<FormValues>;
  isPending?: boolean;
  isFormDisabled?: boolean;
  onSubmit: (data: FormValues) => void;
};

export type FormValues = {
  name: string;
  logo?: string;
  permissions: number;
  eventTypeRead: boolean;
  eventTypeWrite: boolean;
  bookingRead: boolean;
  bookingWrite: boolean;
  scheduleRead: boolean;
  scheduleWrite: boolean;
  appsRead: boolean;
  appsWrite: boolean;
  profileRead: boolean;
  profileWrite: boolean;
  redirectUris: {
    uri: string;
  }[];
  bookingRedirectUri?: string;
  bookingCancelRedirectUri?: string;
  bookingRescheduleRedirectUri?: string;
  areEmailsEnabled?: boolean;
  areDefaultEventTypesEnabled?: boolean;
  areCalendarEventsEnabled?: boolean;
};

export const OAuthClientForm = ({
  defaultValues,
  isPending,
  isFormDisabled,
  onSubmit,
}: OAuthClientFormProps) => {
  const { t } = useLocale();
  const { register, control, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: { redirectUris: [{ uri: "" }], ...defaultValues },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "redirectUris",
  });

  const [isSelectAllPermissionsChecked, setIsSelectAllPermissionsChecked] = useState(false);

  const selectAllPermissions = useCallback(() => {
    Object.keys(PERMISSIONS_GROUPED_MAP).forEach((key) => {
      const entity = key as keyof typeof PERMISSIONS_GROUPED_MAP;
      const permissionKey = PERMISSIONS_GROUPED_MAP[entity].key;

      setValue(`${permissionKey}Read`, !isSelectAllPermissionsChecked);
      setValue(`${permissionKey}Write`, !isSelectAllPermissionsChecked);
    });

    setIsSelectAllPermissionsChecked((preValue) => !preValue);
  }, [isSelectAllPermissionsChecked, setValue]);

  const permissionsCheckboxes = Object.keys(PERMISSIONS_GROUPED_MAP).map((key) => {
    const entity = key as keyof typeof PERMISSIONS_GROUPED_MAP;
    const permissionKey = PERMISSIONS_GROUPED_MAP[entity].key;
    const permissionLabel = PERMISSIONS_GROUPED_MAP[entity].label;

    return (
      <div className="my-3" key={key}>
        <p className="text-sm font-semibold">{permissionLabel}</p>
        <div className="mt-1 flex gap-x-5">
          <div className="flex items-center gap-x-2">
            <input
              {...register(`${permissionKey}Read`)}
              id={`${permissionKey}Read`}
              className="border-default bg-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 transition checked:border-transparent checked:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              style={{ accentColor: "#ffffff" }}
              type="checkbox"
              disabled={!!defaultValues}
            />
            <label htmlFor={`${permissionKey}Read`} className="cursor-pointer text-sm">
              Read
            </label>
          </div>
          <div className="flex items-center gap-x-2">
            <input
              {...register(`${permissionKey}Write`)}
              id={`${permissionKey}Write`}
              className="border-default bg-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 transition checked:border-transparent checked:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              style={{ accentColor: "#ffffff" }}
              type="checkbox"
              disabled={!!defaultValues}
            />
            <label htmlFor={`${permissionKey}Write`} className="cursor-pointer text-sm">
              Write
            </label>
          </div>
        </div>
      </div>
    );
  });

  return (
    <div>
      <form
        className="border-subtle rounded-b-lg border border-t-0 px-4 pb-8 pt-2"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-6">
          <TextField disabled={isFormDisabled} required={true} label="Client name" {...register("name")} />
        </div>
        <div className="mt-6">
          <Label>Redirect uris</Label>
          {fields.map((field, index) => {
            return (
              <div className="flex items-end" key={field.id}>
                <div className="w-[80vw]">
                  <TextField
                    type="url"
                    required={index === 0}
                    className="w-full"
                    label=""
                    disabled={isFormDisabled}
                    {...register(`redirectUris.${index}.uri` as const)}
                  />
                </div>
                <div className="flex">
                  <Button
                    tooltip="Add url"
                    type="button"
                    color="minimal"
                    variant="icon"
                    StartIcon="plus"
                    className="text-default mx-2"
                    disabled={isFormDisabled}
                    onClick={() => {
                      append({ uri: "" });
                    }}
                  />
                  {index > 0 && (
                    <Button
                      tooltip="Remove url"
                      type="button"
                      color="destructive"
                      variant="icon"
                      StartIcon="trash"
                      className="text-default mx-2"
                      disabled={isFormDisabled}
                      onClick={() => {
                        remove(index);
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6">
          <Tooltip content={t("booking_redirect_uri")}>
            <TextField
              type="url"
              label="Booking redirect uri"
              className="w-full"
              {...register("bookingRedirectUri")}
              disabled={isFormDisabled}
            />
          </Tooltip>
        </div>
        <div className="mt-6">
          <Tooltip content={t("booking_cancel_redirect_uri")}>
            <TextField
              type="url"
              label="Booking cancel redirect uri"
              className="w-full"
              {...register("bookingCancelRedirectUri")}
              disabled={isFormDisabled}
            />
          </Tooltip>
        </div>
        <div className="mt-6">
          <Tooltip content={t("booking_reschedule_redirect_uri")}>
            <TextField
              type="url"
              label="Booking reschedule redirect uri"
              className="w-full"
              {...register("bookingRescheduleRedirectUri")}
              disabled={isFormDisabled}
            />
          </Tooltip>
        </div>
        <div className="mt-6">
          <input
            {...register("areEmailsEnabled")}
            id="areEmailsEnabled"
            className="border-default bg-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 transition checked:border-transparent checked:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            style={{ accentColor: "#ffffff" }}
            type="checkbox"
            disabled={isFormDisabled}
          />
          <label htmlFor="areEmailsEnabled" className="cursor-pointer px-2 text-base font-semibold">
            Enable emails
          </label>
        </div>
        <div className="mt-6">
          <div className="flex items-center">
            <input
              {...register("areCalendarEventsEnabled")}
              id="areCalendarEventsEnabled"
              className="border-default bg-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 transition checked:border-transparent checked:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              style={{ accentColor: "#ffffff" }}
              type="checkbox"
              disabled={isFormDisabled}
            />
            <label htmlFor="areCalendarEventsEnabled" className="cursor-pointer px-2 text-base font-semibold">
              Enable calendar events
            </label>
            <Tooltip
              className="max-w-[400px] whitespace-normal"
              content="If enabled and the managed user has calendar connected, an event in the calendar will be created. By default true. Disable it if you want to create events in the calendar manually.">
              <div className="ml-1">
                <Icon name="info" className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </div>
            </Tooltip>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-center">
            <input
              {...register("areDefaultEventTypesEnabled")}
              id="areDefaultEventTypesEnabled"
              className="border-default bg-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 transition checked:border-transparent checked:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              style={{ accentColor: "#ffffff" }}
              type="checkbox"
              disabled={isFormDisabled}
            />
            <label
              htmlFor="areDefaultEventTypesEnabled"
              className="cursor-pointer px-2 text-base font-semibold">
              Enable managed user default event types
            </label>
            <Tooltip
              className="max-w-[400px] whitespace-normal"
              content="If enabled, when creating a managed user the managed user will have 4 default event types: 30 and 60 minutes without Cal video, 30 and 60 minutes with Cal video. Leave this disabled if you want to create a managed user and then manually create event types for the user.">
              <div className="ml-1">
                <Icon name="info" className="h-4 w-4 text-gray-500" aria-hidden="true" />
              </div>
            </Tooltip>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between">
            <h1 className="text-base font-semibold underline">Permissions</h1>
            <Button type="button" onClick={selectAllPermissions} disabled={!!defaultValues || isFormDisabled}>
              {!isSelectAllPermissionsChecked ? "Select all" : "Discard all"}
            </Button>
          </div>
          <div>{permissionsCheckboxes}</div>
        </div>
        <Button className="mt-6" type="submit" loading={isPending}>
          {defaultValues ? t("update") : t("submit")}
        </Button>
      </form>
    </div>
  );
};
