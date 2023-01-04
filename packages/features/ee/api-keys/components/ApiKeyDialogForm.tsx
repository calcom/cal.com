import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { TApiKeys } from "@calcom/ee/api-keys/components/ApiKeyListItem";
import LicenseRequired from "@calcom/ee/common/components/v2/LicenseRequired";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Icon,
  DatePickerField as DatePicker,
  DialogFooter,
  Form,
  showToast,
  Switch,
  TextField,
  Tooltip,
} from "@calcom/ui";

export default function ApiKeyDialogForm({
  defaultValues,
  handleClose,
}: {
  defaultValues?: Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & { neverExpires?: boolean };
  handleClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();

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
              <code className="mb-2 w-full truncate rounded-md rounded-r-none bg-gray-100 py-[6px] pl-2 pr-2 align-middle font-mono text-gray-800">
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
                  className="rounded-l-none py-[19px] text-base ">
                  <Icon.ClipboardCopyIcon className="h-5 w-5 text-neutral-100 ltr:mr-2 rtl:ml-2" />
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
              const apiKey = await utils.client.viewer.apiKeys.create.mutate(event);
              setApiKey(apiKey);
              setApiKeyDetails({ ...event });
              await utils.viewer.apiKeys.list.invalidate();
              setSuccessfulNewApiKeyModal(true);
            }
          }}
          className="space-y-4">
          <div className="mt-1 mb-10">
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
