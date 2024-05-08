import { useRouter } from "next/navigation";
import type { FC } from "react";
import React, { useState, useCallback, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PERMISSIONS_GROUPED_MAP } from "@calcom/platform-constants/permissions";
import { showToast } from "@calcom/ui";
import { Meta, Button, TextField, Label, Tooltip } from "@calcom/ui";

import { useOAuthClient } from "@lib/hooks/settings/organizations/platform/oauth-clients/useOAuthClients";
import {
  useCreateOAuthClient,
  useUpdateOAuthClient,
} from "@lib/hooks/settings/organizations/platform/oauth-clients/usePersistOAuthClient";

import {
  hasAppsReadPermission,
  hasAppsWritePermission,
  hasBookingReadPermission,
  hasBookingWritePermission,
  hasEventTypeReadPermission,
  hasEventTypeWritePermission,
  hasProfileReadPermission,
  hasProfileWritePermission,
  hasScheduleReadPermission,
  hasScheduleWritePermission,
} from "../../../../../../../packages/platform/utils/permissions";

type FormValues = {
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

export const OAuthClientForm: FC<{ clientId?: string }> = ({ clientId }) => {
  const { t } = useLocale();
  const router = useRouter();
  const { data, isFetched, isError, refetch } = useOAuthClient(clientId);
  const { register, control, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      redirectUris: [{ uri: "" }],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "redirectUris",
  });
  useEffect(() => {
    if (isFetched && data && !isError) {
      setValue("name", data.name);
      data.bookingRedirectUri && setValue("bookingRedirectUri", data.bookingRedirectUri);
      data.bookingCancelRedirectUri && setValue("bookingCancelRedirectUri", data.bookingCancelRedirectUri);
      data.bookingRescheduleRedirectUri &&
        setValue("bookingRescheduleRedirectUri", data.bookingRescheduleRedirectUri);
      setValue("areEmailsEnabled", data?.areEmailsEnabled);
      data.redirectUris?.forEach?.((uri: string, index: number) => {
        index === 0 && setValue(`redirectUris.${index}.uri`, uri);
        index !== 0 && append({ uri });
      });
      if (!data.permissions) return;
      if (hasAppsReadPermission(data.permissions)) setValue("appsRead", true);
      if (hasAppsWritePermission(data.permissions)) setValue("appsWrite", true);
      if (hasBookingReadPermission(data.permissions)) setValue("bookingRead", true);
      if (hasBookingWritePermission(data.permissions)) setValue("bookingWrite", true);
      if (hasEventTypeReadPermission(data.permissions)) setValue("eventTypeRead", true);
      if (hasEventTypeWritePermission(data.permissions)) setValue("eventTypeWrite", true);
      if (hasProfileReadPermission(data.permissions)) setValue("profileRead", true);
      if (hasProfileWritePermission(data.permissions)) setValue("profileWrite", true);
      if (hasScheduleReadPermission(data.permissions)) setValue("scheduleRead", true);
      if (hasScheduleWritePermission(data.permissions)) setValue("scheduleWrite", true);
    }
  }, [isFetched, data]);
  const disabledForm = Boolean(clientId && !isFetched && isError);

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

  const { mutateAsync: save, isPending: isSaving } = useCreateOAuthClient({
    onSuccess: () => {
      showToast("OAuth client created successfully", "success");
      refetch();
      router.push("/settings/organizations/platform/oauth-clients");
    },
    onError: () => {
      showToast("Internal server error, please try again later", "error");
    },
  });
  const { mutateAsync: update, isPending: isUpdating } = useUpdateOAuthClient({
    onSuccess: () => {
      showToast("OAuth client updated successfully", "success");
      refetch();
      router.push("/settings/organizations/platform/oauth-clients");
    },
    onError: () => {
      showToast("Internal server error, please try again later", "error");
    },
    clientId,
  });

  const onSubmit = (data: FormValues) => {
    let userPermissions = 0;
    const userRedirectUris = data.redirectUris.map((uri) => uri.uri).filter((uri) => !!uri);

    Object.keys(PERMISSIONS_GROUPED_MAP).forEach((key) => {
      const entity = key as keyof typeof PERMISSIONS_GROUPED_MAP;
      const entityKey = PERMISSIONS_GROUPED_MAP[entity].key;
      const read = PERMISSIONS_GROUPED_MAP[entity].read;
      const write = PERMISSIONS_GROUPED_MAP[entity].write;
      if (data[`${entityKey}Read`]) userPermissions |= read;
      if (data[`${entityKey}Write`]) userPermissions |= write;
    });

    if (clientId) {
      // don't update permissions if client is already created
      update({
        name: data.name,
        // logo: data.logo,
        redirectUris: userRedirectUris,
        bookingRedirectUri: data.bookingRedirectUri,
        bookingCancelRedirectUri: data.bookingCancelRedirectUri,
        bookingRescheduleRedirectUri: data.bookingRescheduleRedirectUri,
        areEmailsEnabled: data.areEmailsEnabled,
      });
    } else {
      save({
        name: data.name,
        permissions: userPermissions,
        // logo: data.logo,
        redirectUris: userRedirectUris,
        bookingRedirectUri: data.bookingRedirectUri,
        bookingCancelRedirectUri: data.bookingCancelRedirectUri,
        bookingRescheduleRedirectUri: data.bookingRescheduleRedirectUri,
        areEmailsEnabled: data.areEmailsEnabled,
      });
    }
  };
  const isPending = isSaving || isUpdating;

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
              className="bg-default border-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              type="checkbox"
              disabled={Boolean(clientId)}
            />
            <label htmlFor={`${permissionKey}Read`} className="cursor-pointer text-sm">
              Read
            </label>
          </div>
          <div className="flex items-center gap-x-2">
            <input
              {...register(`${permissionKey}Write`)}
              id={`${permissionKey}Write`}
              className="bg-default border-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
              type="checkbox"
              disabled={Boolean(clientId)}
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
      <Meta
        title={t("oauth_form_title") + (clientId ? " - Update" : "")}
        description={t("oauth_form_description") + (clientId ? " - Update" : "")}
        borderInShellHeader={true}
      />
      <form
        className="border-subtle rounded-b-lg border border-t-0 px-4 pb-8 pt-2"
        onSubmit={handleSubmit(onSubmit)}>
        <div className="mt-6">
          <TextField disabled={disabledForm} required={true} label="Client name" {...register("name")} />
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
                    disabled={disabledForm}
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
                    onClick={() => {
                      append({ uri: "" });
                    }}
                    disabled={disabledForm}
                  />
                  {index > 0 && (
                    <Button
                      tooltip="Remove url"
                      type="button"
                      color="destructive"
                      variant="icon"
                      StartIcon="trash"
                      className="text-default mx-2 mb-2"
                      onClick={() => {
                        remove(index);
                      }}
                      disabled={disabledForm}
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
          <Tooltip content="URL of your booking page">
            <TextField
              type="url"
              label="Booking redirect uri"
              className="w-[100%]"
              {...register("bookingRedirectUri")}
              disabled={disabledForm}
            />
          </Tooltip>
        </div>
        <div className="mt-6">
          <Tooltip content="URL of the page where your users can cancel their booking">
            <TextField
              type="url"
              label="Booking cancel redirect uri"
              className="w-[100%]"
              {...register("bookingCancelRedirectUri")}
              disabled={disabledForm}
            />
          </Tooltip>
        </div>
        <div className="mt-6">
          <Tooltip content="URL of the page where your users can reschedule their booking">
            <TextField
              type="url"
              label="Booking reschedule redirect uri"
              className="w-[100%]"
              {...register("bookingRescheduleRedirectUri")}
              disabled={disabledForm}
            />
          </Tooltip>
        </div>
        <div className="mt-6">
          <input
            {...register("areEmailsEnabled")}
            id="areEmailsEnabled"
            className="bg-default border-default h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed"
            type="checkbox"
            disabled={disabledForm}
          />
          <label htmlFor="areEmailsEnabled" className="cursor-pointer px-2 text-base font-semibold">
            Enable emails
          </label>
        </div>

        <div className="mt-6">
          <div className="flex justify-between">
            <Tooltip side="right" content="Permissions once set cannot be modified">
              <h1 className="text-base font-semibold underline">Permissions</h1>
            </Tooltip>
            <Button type="button" onClick={selectAllPermissions} disabled={disabledForm || Boolean(clientId)}>
              {!isSelectAllPermissionsChecked ? "Select all" : "Discard all"}
            </Button>
          </div>
          <div>{permissionsCheckboxes}</div>
        </div>

        <Button className="mt-6" type="submit" loading={isPending} disabled={disabledForm}>
          {clientId ? "Update" : "Submit"}
        </Button>
      </form>
    </div>
  );
};
