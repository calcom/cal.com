import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/v2/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { DialogFooter } from "@calcom/ui/Dialog";
import { ClipboardCopyIcon } from "@calcom/ui/Icon";
import { Tooltip } from "@calcom/ui/Tooltip";
import { DatePicker } from "@calcom/ui/v2";
import Button from "@calcom/ui/v2/core/Button";
import Switch from "@calcom/ui/v2/core/Switch";
import { Form, TextField } from "@calcom/ui/v2/core/form/fields";
import showToast from "@calcom/ui/v2/core/notifications";

export default function ApiKeyDialogForm({
  defaultValues,
  handleClose,
}: {
  defaultValues?: Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & { neverExpires?: boolean };
  handleClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const updateApiKeyMutation = trpc.useMutation("viewer.apiKeys.edit", {
    onSuccess() {
      utils.invalidateQueries("viewer.apiKeys.list");
      showToast(t("api_key_updated"), "success");
      handleClose();
    },
    onError() {
      showToast(t("api_key_update_failed"), "error");
    },
  });

  const [apiKey, setApiKey] = useState("");
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
      expiresAt: defaultValues?.expiresAt || dayjs().add(1, "month").toDate(),
    },
  });
  const watchNeverExpires = form.watch("neverExpires");

  return (
    <LicenseRequired>
      {successfulNewApiKeyModal ? (
        <>
          <div className="mb-10">
            <h2 className="font-semi-bold font-cal mb-2 text-xl tracking-wide text-gray-900">
              {t("success_api_key_created")}
            </h2>
            <div className="text-sm text-gray-900">
              <span className="font-semibold">{t("success_api_key_created_bold_tagline")}</span>{" "}
              {t("you_will_only_view_it_once")}
            </div>
          </div>
          <div>
            <div className="flex">
              <code className="my-2 mr-1 w-full truncate rounded-sm bg-gray-100 py-2 px-3 align-middle font-mono text-gray-800">
                {apiKey}
              </code>
              <Tooltip side="top" content={t("copy_to_clipboard")}>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    showToast(t("api_key_copied"), "success");
                  }}
                  type="button"
                  className=" my-2 px-4 text-base">
                  <ClipboardCopyIcon className="mr-2 h-5 w-5 text-neutral-100" />
                  {t("copy")}
                </Button>
              </Tooltip>
            </div>
            <span className="text-sm text-gray-400">
              {apiKeyDetails.neverExpires
                ? t("never_expire_key")
                : `${t("expires")} ${apiKeyDetails?.expiresAt?.toLocaleDateString()}`}
            </span>
          </div>
          <DialogFooter>
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
              const apiKey = await utils.client.mutation("viewer.apiKeys.create", event);
              setApiKey(apiKey);
              setApiKeyDetails({ ...event });
              await utils.invalidateQueries(["viewer.apiKeys.list"]);
              setSuccessfulNewApiKeyModal(true);
            }
          }}
          className="space-y-4">
          <div className="mb-10 mt-1">
            <h2 className="font-semi-bold font-cal text-xl tracking-wide text-gray-900">
              {defaultValues ? t("edit_api_key") : t("create_api_key")}
            </h2>
            <p className="mt-1 mb-5 text-sm text-gray-500">{t("api_key_modal_subtitle")}</p>
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
                <span className="block text-sm font-medium text-gray-700">{t("expire_date")}</span>
                <Controller
                  name="neverExpires"
                  control={form.control}
                  render={({ field: { onChange, value } }) => (
                    <Switch
                      label={t("never_expire_key")}
                      onCheckedChange={onChange}
                      checked={value}
                      disabled={!!defaultValues}
                    />
                  )}
                />
              </div>
              <Controller
                name="expiresAt"
                render={({ field: { onChange, value } }) => (
                  <DatePicker
                    disabled={watchNeverExpires || !!defaultValues}
                    minDate={new Date()}
                    date={value}
                    onDatesChange={onChange}
                  />
                )}
              />
            </div>
          )}

          <DialogFooter>
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
