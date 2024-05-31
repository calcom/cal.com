import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import type { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, DialogFooter, Form, SelectField, showToast, Switch, TextField, Tooltip } from "@calcom/ui";

export default function ApiKeyDialogForm({
  defaultValues,
  handleClose,
}: {
  defaultValues?: Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & { neverExpires?: boolean };
  handleClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const updateApiKeyMutation = trpc.viewer.apiKeys.edit.useMutation({
    onSuccess() {
      utils.viewer.apiKeys.list.invalidate();
      showToast(t("api_key_updated"), "success");
      handleClose();
    },
    onError() {
      showToast(t("api_key_update_failed"), "error");
    },
  });
  type Option = { value: Date | null | undefined; label: string };
  const [apiKey, setApiKey] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null | undefined>(
    () => defaultValues?.expiresAt || dayjs().add(30, "day").toDate()
  );
  const [successfulNewApiKeyModal, setSuccessfulNewApiKeyModal] = useState(false);
  const [apiKeyDetails, setApiKeyDetails] = useState({
    expiresAt: null as Date | null,
    note: "" as string | null,
    neverExpires: false,
  });

  const form = useForm({
    defaultValues: {
      note: defaultValues?.note || "",
      neverExpires: defaultValues?.neverExpires || false,
      expiresAt: defaultValues?.expiresAt || dayjs().add(30, "day").toDate(),
    },
  });
  const watchNeverExpires = form.watch("neverExpires");

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

  return (
    <LicenseRequired>
      {successfulNewApiKeyModal ? (
        <>
          <div className="mb-6">
            <h2 className="font-semi-bold font-cal text-emphasis mb-2 text-xl tracking-wide">
              {t("success_api_key_created")}
            </h2>
            <div className="text-emphasis text-sm">
              <span className="font-semibold">{t("success_api_key_created_bold_tagline")}</span>{" "}
              {t("you_will_only_view_it_once")}
            </div>
          </div>
          <div>
            <div className="flex">
              <code className="bg-subtle text-default w-full truncate rounded-md rounded-r-none py-[6px] pl-2 pr-2 align-middle font-mono">
                {" "}
                {apiKey}
              </code>
              <Tooltip side="top" content={t("copy_to_clipboard")}>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    showToast(t("api_key_copied"), "success");
                  }}
                  type="button"
                  className="rounded-l-none text-base"
                  StartIcon="clipboard">
                  {t("copy")}
                </Button>
              </Tooltip>
            </div>
            <span className="text-muted text-sm">
              {apiKeyDetails.neverExpires
                ? t("never_expires")
                : `${t("expires")} ${apiKeyDetails?.expiresAt?.toLocaleDateString()}`}
            </span>
          </div>
          <DialogFooter showDivider className="relative">
            <Button type="button" color="secondary" onClick={handleClose} tabIndex={-1}>
              {t("done")}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <Form
          form={form}
          handleSubmit={async (event) => {
            if (defaultValues) {
              console.log("Name changed");
              await updateApiKeyMutation.mutate({ id: defaultValues.id, note: event.note });
            } else {
              const apiKey = await utils.client.viewer.apiKeys.create.mutate(event);
              setApiKey(apiKey);
              setApiKeyDetails({ ...event });
              await utils.viewer.apiKeys.list.invalidate();
              setSuccessfulNewApiKeyModal(true);
            }
          }}
          className="space-y-4">
          <div className="mb-4 mt-1">
            <h2 className="font-semi-bold font-cal text-emphasis text-xl tracking-wide">
              {defaultValues ? t("edit_api_key") : t("create_api_key")}
            </h2>
            <p className="text-subtle mb-5 mt-1 text-sm">{t("api_key_modal_subtitle")}</p>
          </div>
          <div>
            <Controller
              name="note"
              control={form.control}
              render={({ field: { onChange, value } }) => (
                <TextField
                  name="note"
                  label={t("personal_note")}
                  placeholder={t("personal_note_placeholder")}
                  value={value}
                  onChange={(e) => {
                    form.setValue("note", e?.target.value);
                  }}
                  type="text"
                />
              )}
            />
          </div>
          {!defaultValues && (
            <div className="flex flex-col">
              <div className="flex justify-between py-2">
                <span className="text-default block text-sm font-medium">{t("expire_date")}</span>
                <Controller
                  name="neverExpires"
                  control={form.control}
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      label={t("never_expires")}
                      onCheckedChange={onChange}
                      checked={value}
                      disabled={!!defaultValues}
                    />
                  )}
                />
              </div>
              <Controller
                name="expiresAt"
                render={({ field: { onChange, value } }) => {
                  const defaultValue = expiresAtOptions[1];

                  return (
                    <SelectField
                      styles={{
                        singleValue: (baseStyles) => ({
                          ...baseStyles,
                          fontSize: "14px",
                        }),
                        option: (baseStyles) => ({
                          ...baseStyles,
                          fontSize: "14px",
                        }),
                      }}
                      isDisabled={watchNeverExpires || !!defaultValues}
                      containerClassName="data-testid-field-type"
                      options={expiresAtOptions}
                      onChange={(option) => {
                        if (!option) {
                          return;
                        }
                        onChange(option.value);
                        setExpiryDate(option.value);
                      }}
                      defaultValue={defaultValue}
                    />
                  );
                }}
              />
              {!watchNeverExpires && (
                <span className="text-subtle mt-2 text-xs">
                  {t("api_key_expires_on")}
                  <span className="font-bold"> {dayjs(expiryDate).format("DD-MM-YYYY")}</span>
                </span>
              )}
            </div>
          )}

          <DialogFooter showDivider className="relative">
            <Button type="button" color="secondary" onClick={handleClose} tabIndex={-1}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {apiKeyDetails ? t("save") : t("create")}
            </Button>
          </DialogFooter>
        </Form>
      )}
    </LicenseRequired>
  );
}
