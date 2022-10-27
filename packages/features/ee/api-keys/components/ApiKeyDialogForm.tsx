import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import dayjs from "@calcom/dayjs";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import Button from "@calcom/ui/Button";
import { DialogFooter } from "@calcom/ui/Dialog";
import { ClipboardCopyIcon } from "@calcom/ui/Icon";
import Switch from "@calcom/ui/Switch";
import { Tooltip } from "@calcom/ui/Tooltip";
import { Form, TextField } from "@calcom/ui/form/fields";
import { DatePicker } from "@calcom/ui/v2";
import showToast from "@calcom/ui/v2/core/notifications";

import LicenseRequired from "../../common/components/LicenseRequired";
import type { TApiKeys } from "./ApiKeyListItem";

export default function ApiKeyDialogForm(props: {
  title: string;
  defaultValues?: Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & { neverExpires?: boolean };
  handleClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();

  const {
    defaultValues = {
      note: "",
      neverExpires: false,
      expiresAt: dayjs().add(1, "month").toDate(),
    },
  } = props;

  const [apiKey, setApiKey] = useState("");
  const [successfulNewApiKeyModal, setSuccessfulNewApiKeyModal] = useState(false);
  const [apiKeyDetails, setApiKeyDetails] = useState({
    id: "",
    hashedKey: "",
    expiresAt: null as Date | null,
    note: "" as string | null,
    neverExpires: false,
  });

  const form = useForm({
    defaultValues,
  });
  const watchNeverExpires = form.watch("neverExpires");

  return (
    <LicenseRequired>
      {successfulNewApiKeyModal ? (
        <>
          <div className="mb-10">
            <h2 className="font-semi-bold font-cal mb-2 text-xl tracking-wide text-gray-900">
              {apiKeyDetails ? t("success_api_key_edited") : t("success_api_key_created")}
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
            <Button type="button" color="secondary" onClick={props.handleClose} tabIndex={-1}>
              {t("done")}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <Form<Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt"> & { neverExpires?: boolean }>
          form={form}
          handleSubmit={async (event) => {
            const apiKey = await utils.client.mutation("viewer.apiKeys.create", event);
            setApiKey(apiKey);
            setApiKeyDetails({ ...event, neverExpires: !!event.neverExpires });
            await utils.invalidateQueries(["viewer.apiKeys.list"]);
            setSuccessfulNewApiKeyModal(true);
          }}
          className="space-y-4">
          <div className="mb-10 mt-1">
            <h2 className="font-semi-bold font-cal text-xl tracking-wide text-gray-900">{props.title}</h2>
            <p className="mt-1 mb-5 text-sm text-gray-500">{t("api_key_modal_subtitle")}</p>
          </div>
          <div>
            <TextField
              label={t("personal_note")}
              placeholder={t("personal_note_placeholder")}
              {...form.register("note")}
              type="text"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between py-2">
              <span className="block text-sm font-medium text-gray-700">{t("expire_date")}</span>
              <Controller
                name="neverExpires"
                render={({ field: { onChange, value } }) => (
                  <Switch label={t("never_expire_key")} onCheckedChange={onChange} checked={value} />
                )}
              />
            </div>
            <Controller
              name="expiresAt"
              render={({ field: { onChange, value } }) => (
                <DatePicker
                  disabled={watchNeverExpires}
                  minDate={new Date()}
                  date={value}
                  onDatesChange={onChange}
                />
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" color="secondary" onClick={props.handleClose} tabIndex={-1}>
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
