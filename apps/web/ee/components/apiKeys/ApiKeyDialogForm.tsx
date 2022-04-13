import { ClipboardCopyIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";
import { DialogFooter } from "@calcom/ui/Dialog";
import Switch from "@calcom/ui/Switch";
import { Form, TextField } from "@calcom/ui/form/fields";

import { trpc } from "@lib/trpc";

import { Tooltip } from "@components/Tooltip";
import { DatePicker } from "@components/ui/form/DatePicker";

import { TApiKeys } from "./ApiKeyListItem";

export default function ApiKeyDialogForm(props: {
  title: string;
  defaultValues?: TApiKeys;
  handleClose: () => void;
}) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [neverExpires, setNeverExpires] = useState(false);
  const handleNoteChange = (e: { target: { value: string } }) => {
    form.setValue("note", e.target.value);
  };
  const {
    defaultValues = {
      note: "" as string | undefined,
      expiresAt: dayjs().add(1, "month").toDate(),
    } as Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt">,
  } = props;

  const [selectedDate, setSelectedDate] = useState(dayjs().add(1, "month").toDate());
  const [newApiKey, setNewApiKey] = useState("");
  const [successfulNewApiKeyModal, setSuccessfulNewApiKeyModal] = useState(false);
  const [newApiKeyDetails, setNewApiKeyDetails] = useState({
    id: "",
    hashedKey: "",
    expiresAt: null as Date | null,
    note: "" as string | null,
  });

  const handleDateChange = (e: Date) => {
    setSelectedDate(e);
    form.setValue("expiresAt", e);
  };

  const form = useForm({
    defaultValues,
  });
  return (
    <>
      {successfulNewApiKeyModal ? (
        <>
          <div className="mb-10">
            <h2 className="font-semi-bold font-cal mb-2 text-xl tracking-wide text-gray-900">
              {" "}
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
                {newApiKey}
              </code>
              <Tooltip content={t("copy_to_clipboard")}>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(newApiKey);
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
              {" "}
              {t("expires")} {newApiKeyDetails?.expiresAt?.toLocaleDateString()}
            </span>
          </div>
          <DialogFooter>
            <Button type="button" color="secondary" onClick={props.handleClose} tabIndex={-1}>
              {t("done")}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <Form
          form={form}
          handleSubmit={async (event) => {
            try {
              const newApiKey = await utils.client.mutation("viewer.apiKeys.create", event);
              setNewApiKey(newApiKey);
              setNewApiKeyDetails({ ...event });
              await utils.invalidateQueries(["viewer.apiKeys.list"]);
              setSuccessfulNewApiKeyModal(true);
            } catch (error: any) {
              console.log(error);
              showToast(error.message, "error");
            }
          }}
          className="space-y-4">
          <div className=" mb-10 mt-1">
            <h2 className="font-semi-bold font-cal text-xl tracking-wide text-gray-900">{props.title}</h2>
            <p className="mt-1 mb-5 text-sm text-gray-500">{t("api_key_modal_subtitle")}</p>
          </div>
          <TextField
            label={t("personal_note")}
            placeholder={t("personal_note_placeholder")}
            {...form.register("note")}
            type="text"
            onChange={handleNoteChange}
          />

          <div className="flex flex-col">
            <div className="flex justify-between py-2">
              <span className="block text-sm font-medium text-gray-700">{t("expire_date")}</span>
              <Switch
                label={t("never_expire_key")}
                defaultChecked={neverExpires}
                onCheckedChange={(isChecked) => {
                  if (isChecked) {
                    form.setValue("expiresAt", null);
                    setNeverExpires(true);
                  } else {
                    setNeverExpires(false);
                    form.setValue("expiresAt", form.getValues().expiresAt || new Date());
                  }
                }}
              />
            </div>
            <DatePicker
              disabled={form.getValues().expiresAt === null}
              minDate={new Date()}
              date={selectedDate as Date}
              onDatesChange={handleDateChange}
            />
          </div>
          <DialogFooter>
            <Button type="button" color="secondary" onClick={props.handleClose} tabIndex={-1}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t("create")}
            </Button>
          </DialogFooter>
        </Form>
      )}
    </>
    // </>
  );
}
