"use client";

import dayjs from "@calcom/dayjs";
import { API_NAME_LENGTH_MAX_LIMIT, IS_CALCOM } from "@calcom/lib/constants";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { revalidateApiKeysList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/api-keys/actions";
import { Alert, AlertDescription, AlertTitle } from "@coss/ui/components/alert";
import { Button } from "@coss/ui/components/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@coss/ui/components/field";
import { Form } from "@coss/ui/components/form";
import { Input } from "@coss/ui/components/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "@coss/ui/components/select";
import { Switch } from "@coss/ui/components/switch";
import { toastManager } from "@coss/ui/components/toast";
import { TriangleAlertIcon } from "@coss/ui/icons";
import { CopyableField } from "@coss/ui/shared/copyable-field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MutableRefObject, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { TApiKeys } from "~/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "~/ee/common/components/LicenseRequired";

type Option = { value: Date | null | undefined; label: string };
type ApiKeyFormValues = {
  note: string;
  neverExpires: boolean;
  expiresAt: Date | null | undefined;
};

export default function ApiKeyDialogForm({
  defaultValues,
  handleClose,
  initialFocusRef,
}: {
  defaultValues?: Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & { neverExpires?: boolean };
  handleClose: () => void;
  initialFocusRef?: MutableRefObject<HTMLInputElement | null>;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const router = useRouter();

  const updateApiKeyMutation = trpc.viewer.apiKeys.edit.useMutation({
    async onSuccess() {
      await utils.viewer.apiKeys.list.invalidate();
      await revalidateApiKeysList();
      router.refresh();
      toastManager.add({ title: t("api_key_updated"), type: "success" });
      handleClose();
    },
    onError() {
      toastManager.add({ title: t("api_key_update_failed"), type: "error" });
    },
  });

  const [apiKey, setApiKey] = useState("");
  const [successfulNewApiKeyModal, setSuccessfulNewApiKeyModal] = useState(false);
  const [apiKeyDetails, setApiKeyDetails] = useState({
    expiresAt: null as Date | null,
    note: "" as string | null,
    neverExpires: false,
  });

  const form = useForm<ApiKeyFormValues>({
    defaultValues: {
      note: defaultValues?.note || "",
      neverExpires: defaultValues?.neverExpires || false,
      expiresAt: defaultValues?.expiresAt || dayjs().add(30, "day").toDate(),
    },
    mode: "onChange",
    criteriaMode: "all",
    resolver: (values) => {
      const errors: { note?: { type: string; message: string } } = {};
      if (values.note && values.note.length > API_NAME_LENGTH_MAX_LIMIT) {
        errors.note = {
          type: "maxLength",
          message: t("api_key_name_too_long", { max: API_NAME_LENGTH_MAX_LIMIT }),
        };
      }
      return { values, errors };
    },
  });

  const expiresAtOptions = useMemo<Option[]>(
    () => [
      {
        label: t("seven_days"),
        value: dayjs().add(7, "day").toDate(),
      },
      {
        label: t("thirty_days"),
        value: dayjs().add(30, "day").toDate(),
      },
      {
        label: t("three_months"),
        value: dayjs().add(3, "month").toDate(),
      },
      {
        label: t("one_year"),
        value: dayjs().add(1, "year").toDate(),
      },
    ],
    [t]
  );
  const expiresAtSelectItems = useMemo(
    () =>
      expiresAtOptions.map((option, index) => ({
        label: option.label,
        value: String(index),
      })),
    [expiresAtOptions]
  );
  const watchedExpiresAt = form.watch("expiresAt");
  const getExpiresAtSelectValue = (value: Date | null | undefined) => {
    if (!value) return "1";

    const matchedIndex = expiresAtOptions.findIndex((option) => {
      if (!option.value) return false;
      return option.value.getTime() === value.getTime();
    });

    return String(matchedIndex >= 0 ? matchedIndex : 1);
  };

  return (
    <LicenseRequired>
      {successfulNewApiKeyModal ? (
        <>
          <DialogHeader>
            <DialogTitle>{t("success_api_key_created")}</DialogTitle>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-6">
            <Alert variant="warning">
              <TriangleAlertIcon />
              <AlertTitle>{t("success_api_key_created_bold_tagline")}</AlertTitle>
              <AlertDescription>{t("you_will_only_view_it_once")}</AlertDescription>
            </Alert>
            <CopyableField
              label={t("api_key")}
              value={apiKey}
              monospace
              copyTooltip={t("copy_to_clipboard")}
              copiedTooltip={t("api_key_copied")}
              description={
                apiKeyDetails.neverExpires ? (
                  t("never_expires")
                ) : (
                  <>
                    {t("expires")}{" "}
                    <span className="font-medium">{apiKeyDetails?.expiresAt?.toLocaleDateString()}</span>
                  </>
                )
              }
            />
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button />}>{t("done")}</DialogClose>
          </DialogFooter>
        </>
      ) : (
        <Form
          className="contents"
          onSubmit={form.handleSubmit(async (event) => {
            if (defaultValues) {
              await updateApiKeyMutation.mutate({ id: defaultValues.id, note: event.note });
            } else {
              const apiKey = await utils.client.viewer.apiKeys.create.mutate(event);
              setApiKey(apiKey);
              setApiKeyDetails({ ...event, expiresAt: event.expiresAt ?? null });
              await utils.viewer.apiKeys.list.invalidate();
              await revalidateApiKeysList();
              router.refresh();
              setSuccessfulNewApiKeyModal(true);
            }
          })}>
          <DialogHeader>
            <DialogTitle>{defaultValues ? t("edit_api_key") : t("create_api_key")}</DialogTitle>
            {!IS_CALCOM && <DialogDescription>{t("api_key_modal_subtitle")}</DialogDescription>}
          </DialogHeader>
          <DialogPanel>
            <div className="flex flex-col gap-4">
              {IS_CALCOM && (
                <div className="flex flex-col sm:flex-row rounded-lg bg-muted p-0.5">
                  <div className="relative flex w-full items-start rounded-md font-medium p-2 text-xs text-muted-foreground bg-background shadow-sm/5 dark:bg-input">
                    {t("api_key_modal_subtitle")}
                  </div>
                  <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://cal.com/integrate"
                    className="relative flex w-full items-start rounded-md font-medium text-muted-foreground/72 hover:text-muted-foreground p-2 text-xs">
                    {t("api_key_modal_subtitle_platform")}
                  </Link>
                </div>
              )}

              <Controller
                name="note"
                control={form.control}
                render={({
                  field: { ref, name, value, onBlur, onChange },
                  fieldState: { invalid, error },
                }) => (
                  <Field name={name} invalid={invalid}>
                    <FieldLabel>{t("personal_note")}</FieldLabel>
                    <Input
                      id={name}
                      ref={(element) => {
                        ref(element);
                        if (initialFocusRef) {
                          initialFocusRef.current = element;
                        }
                      }}
                      name={name}
                      placeholder={t("personal_note_placeholder")}
                      value={value}
                      onBlur={onBlur}
                      onChange={(e) => onChange(e.target.value)}
                    />
                    <FieldError match={!!error}>{error?.message}</FieldError>
                  </Field>
                )}
              />

              {!defaultValues && (
                <div className="flex flex-col gap-3">
                  <Controller
                    name="neverExpires"
                    control={form.control}
                    render={({ field: { name, value, onBlur, onChange }, fieldState: { invalid } }) => (
                      <Collapsible onOpenChange={(open) => onChange(!open)} open={!value}>
                        <Field name={name} invalid={invalid}>
                          <FieldLabel>
                            <CollapsibleTrigger
                              nativeButton={false}
                              render={
                                <Switch
                                  checked={value}
                                  onBlur={onBlur}
                                  onCheckedChange={(checked) => onChange(checked === true)}
                                />
                              }
                            />
                            {t("never_expires")}
                          </FieldLabel>
                        </Field>
                        <CollapsiblePanel>
                          <Controller
                            name="expiresAt"
                            control={form.control}
                            render={({
                              field: { name, value, onBlur, onChange },
                              fieldState: { invalid },
                            }) => (
                              <Field className="mt-4" name={name} invalid={invalid}>
                                <FieldLabel>{t("expire_date")}</FieldLabel>
                                <Select
                                  aria-label={t("expire_date")}
                                  items={expiresAtSelectItems}
                                  name={name}
                                  onOpenChange={(open) => {
                                    if (!open) onBlur();
                                  }}
                                  value={getExpiresAtSelectValue(value)}
                                  onValueChange={(val) => {
                                    const idx = Number(val);
                                    const option = expiresAtOptions[idx];
                                    if (option) {
                                      onChange(option.value);
                                    }
                                  }}>
                                  <SelectTrigger className="w-full">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectPopup>
                                    {expiresAtOptions.map((option, index) => (
                                      <SelectItem key={option.label} value={String(index)}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectPopup>
                                </Select>
                                <FieldDescription>
                                  {t("api_key_expires_on")}{" "}
                                  <span className="font-medium">
                                    {dayjs(watchedExpiresAt).format("DD-MM-YYYY")}
                                  </span>
                                </FieldDescription>
                              </Field>
                            )}
                          />
                        </CollapsiblePanel>
                      </Collapsible>
                    )}
                  />
                </div>
              )}
            </div>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>{t("cancel")}</DialogClose>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {defaultValues ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </Form>
      )}
    </LicenseRequired>
  );
}
