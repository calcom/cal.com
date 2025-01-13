import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants/permissions";
import { TextField, Tooltip, Button, Label } from "@calcom/ui";

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
              className="bg-default border-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
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
              className="bg-default border-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
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
                    className="w-[100%]"
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
                    className="text-default mx-2 mb-2"
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
                      className="text-default mx-2 mb-2"
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
        {/** <div className="mt-6">
          <Controller
            control={control}
            name="logo"
            render={({ field: { value } }) => (
              <>
                <Label>Client logo</Label>
                <div className="flex items-center">
                  <Avatar
                    alt=""
                    imageSrc={value}
                    fallback={<Icon name="plus" className="text-subtle h-4 w-4" />}
                    size="sm"
                  />
                  <div className="ms-4">
                    <ImageUploader
                      target="avatar"
                      id="vatar-upload"
                      buttonMsg="Upload"
                      imageSrc={value}
                      handleAvatarChange={(newAvatar: string) => {
                        setValue("logo", newAvatar);
                      }}
                    />
                  </div>
                </div>
              </>
            )}
          />
        </div> */}
        <div className="mt-6">
          <Tooltip content={t("booking_redirect_uri")}>
            <TextField
              type="url"
              label="Booking redirect uri"
              className="w-[100%]"
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
              className="w-[100%]"
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
              className="w-[100%]"
              {...register("bookingRescheduleRedirectUri")}
              disabled={isFormDisabled}
            />
          </Tooltip>
        </div>
        <div className="mt-6">
          <input
            {...register("areEmailsEnabled")}
            id="areEmailsEnabled"
            className="bg-default border-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            type="checkbox"
            disabled={isFormDisabled}
          />
          <label htmlFor="areEmailsEnabled" className="cursor-pointer px-2 text-base font-semibold">
            Enable emails
          </label>
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
