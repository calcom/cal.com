"use client";

import { Button } from "@calid/features/ui/components/button";
import { Form, FormField } from "@calid/features/ui/components/form";
import { TextAreaField } from "@calid/features/ui/components/input/text-area";
import { Label } from "@calid/features/ui/components/label";
import { Switch } from "@calid/features/ui/components/switch";
import { triggerToast } from "@calid/features/ui/components/toast";
import { useState } from "react";
import { useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Select } from "@calcom/ui/form/select";
import { revalidateApiKeysList } from "@calcom/web/app/(use-page-wrapper)/settings/(settings-layout)/developer/api-keys/actions";

import type { TApiKeys } from "./api-keys-list-item";

type Option = { value: Date | null | undefined; label: string };

export type ApiKeyFormData = {
  id?: string;
  note: string | null;
  expiresAt: Date | null | undefined;
  neverExpires: boolean;
};

export default function ApiKeyDialogForm({
  defaultValues,
  onCancel,
}: {
  defaultValues?: Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & { neverExpires?: boolean };
  onCancel?: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const [successfulNewApiKeyModal, setSuccessfulNewApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyDetails, setApiKeyDetails] = useState<ApiKeyFormData>({
    note: null,
    expiresAt: null,
    neverExpires: false,
  });

  const updateApiKeyMutation = trpc.viewer.apiKeys.edit.useMutation({
    async onSuccess() {
      await utils.viewer.apiKeys.list.invalidate();
      revalidateApiKeysList();
      triggerToast(t("api_key_updated"), "success");
      if (onCancel) onCancel();
    },
    onError() {
      triggerToast(t("api_key_update_failed"), "error");
    },
  });

  const expiresAtOptions: Option[] = [
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
  ];

  const formMethods = useForm<ApiKeyFormData>({
    defaultValues: {
      note: defaultValues?.note || "",
      neverExpires: defaultValues?.neverExpires || false,
      expiresAt: defaultValues?.expiresAt || dayjs().add(30, "day").toDate(),
    },
  });

  const watchNeverExpires = formMethods.watch("neverExpires");
  const watchExpiresAt = formMethods.watch("expiresAt");

  const onSubmit = async (values: ApiKeyFormData) => {
    if (defaultValues) {
      await updateApiKeyMutation.mutateAsync({ id: defaultValues.id, note: values.note });
    } else {
      const newApiKey = await utils.client.viewer.apiKeys.create.mutate({
        note: values.note,
        expiresAt: values.neverExpires ? undefined : values.expiresAt,
        neverExpires: values.neverExpires,
      });
      setApiKey(newApiKey);
      setApiKeyDetails(values);
      await utils.viewer.apiKeys.list.invalidate();
      revalidateApiKeysList();
      setSuccessfulNewApiKeyModal(true);
    }
  };

  if (successfulNewApiKeyModal) {
    return (
      <div className="p-2">
        <div className="mb-4">
          <h2 className="text-emphasis mb-2 text-lg font-semibold">{t("success_api_key_created")}</h2>
          <p className="text-emphasis text-sm">
            <span className="font-semibold">{t("success_api_key_created_bold_tagline")}</span>{" "}
            {t("you_will_only_view_it_once")}
          </p>
        </div>

        <div className="mb-4">
          <Label className="text-emphasis mb-2 text-sm font-medium">{t("api_key")}</Label>
          <div className="flex">
            <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none border border-r-0 py-2 pl-3 pr-2 font-mono text-sm">
              {apiKey}
            </code>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(apiKey);
                triggerToast(t("api_key_copied"), "success");
              }}
              type="button"
              className="rounded-l-none"
              StartIcon="clipboard">
              {t("copy")}
            </Button>
          </div>
          <p className="text-muted mt-2 text-xs">
            {apiKeyDetails.neverExpires
              ? t("never_expires")
              : `${t("expires")} ${dayjs(apiKeyDetails?.expiresAt).format("DD-MM-YYYY")}`}
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" color="secondary" onClick={onCancel}>
            {t("done")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form form={formMethods} onSubmit={onSubmit}>
      <div className="p-2">
        <FormField
          name="note"
          control={formMethods.control}
          render={({ field: { value } }) => (
            <TextAreaField
              name="note"
              label={t("personal_note")}
              labelProps={{ className: "font-medium text-default text-sm" }}
              placeholder={t("personal_note_placeholder")}
              value={value || ""}
              rows={3}
              onChange={(e) => {
                formMethods.setValue("note", e?.target.value, { shouldDirty: true });
              }}
            />
          )}
        />

        {!defaultValues && (
          <>
            <FormField
              name="neverExpires"
              control={formMethods.control}
              render={({ field: { value } }) => (
                <div className="mt-6">
                  <Switch
                    label={t("never_expires")}
                    labelClassName="font-medium text-emphasis text-sm"
                    checked={value}
                    onCheckedChange={(checked) => {
                      formMethods.setValue("neverExpires", checked, { shouldDirty: true });
                    }}
                  />
                </div>
              )}
            />

            <FormField
              name="expiresAt"
              control={formMethods.control}
              render={({ field: { value } }) => {
                const selectValue = expiresAtOptions.find((option) => {
                  if (!value || !option.value) return false;
                  return dayjs(value).isSame(dayjs(option.value), "day");
                });

                return (
                  <div className="mt-6">
                    <Label className="text-emphasis mb-2 text-sm font-medium">{t("expire_date")}</Label>
                    <Select
                      options={expiresAtOptions}
                      value={selectValue || expiresAtOptions[1]}
                      isDisabled={watchNeverExpires}
                      onChange={(option) => {
                        if (option?.value) {
                          formMethods.setValue("expiresAt", option.value, { shouldDirty: true });
                        }
                      }}
                    />
                    {!watchNeverExpires && watchExpiresAt && (
                      <p className="text-muted mt-2 text-xs">
                        {t("api_key_expires_on")}{" "}
                        <span className="font-semibold">{dayjs(watchExpiresAt).format("DD-MM-YYYY")}</span>
                      </p>
                    )}
                  </div>
                );
              }}
            />
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" color="secondary" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={!formMethods.formState.isDirty}
            loading={formMethods.formState.isSubmitting}>
            {defaultValues?.id ? t("save") : t("create")}
          </Button>
        </div>
      </div>
    </Form>
  );
}
