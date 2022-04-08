import { CheckCircleIcon, ClipboardCopyIcon } from "@heroicons/react/solid";
import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { unknown } from "zod";

import { generateUniqueAPIKey } from "@calcom/ee/lib/api/apiKeys";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";
import { Dialog, DialogContent, DialogFooter } from "@calcom/ui/Dialog";
import Switch from "@calcom/ui/Switch";
import { FieldsetLegend, Form, InputGroupBox, TextArea, TextField } from "@calcom/ui/form/fields";

import { trpc } from "@lib/trpc";

import { Tooltip } from "@components/Tooltip";
import { DatePicker } from "@components/ui/form/DatePicker";

import { TApiKeys } from "./ApiKeyListItem";

export default function ApiKeyDialogForm(props: { defaultValues?: TApiKeys; handleClose: () => void }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const handleNoteChange = (e) => {
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

  const handleDateChange = (e) => {
    setSelectedDate(e);
    form.setValue("expiresAt", e);
  };

  const form = useForm({
    defaultValues,
  });
  return (
    <>
      <Dialog
        open={successfulNewApiKeyModal}
        onOpenChange={(isOpen) => !isOpen && setSuccessfulNewApiKeyModal(false)}>
        <DialogContent>
          <div className="flex space-x-5 align-middle">
            <CheckCircleIcon className="h-10 w-10 place-content-center text-green-500" aria-hidden="true" />
            <h2 className="text-bold mt-1 mb-10 text-xl text-gray-700">
              You have created your new API Key successfully
            </h2>
          </div>

          <div>
            <div className="flex">
              <code className="m-2 rounded-sm bg-gray-300 py-1 px-2 align-middle">cal_{newApiKey}</code>
              <Tooltip content={t("copy_to_clipboard")}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(newApiKey);
                    showToast("API key copied!", "success");
                  }}
                  type="button"
                  className="text-md mt-2 flex h-8 items-center rounded-sm bg-transparent px-1 text-sm font-medium text-gray-700 hover:bg-gray-200 hover:text-gray-900">
                  <ClipboardCopyIcon className="h-4 w-4 text-neutral-500" />
                </button>
              </Tooltip>
            </div>

            <hr className="my-4" />
            <div className="text-md text-gray-400">
              Please make sure to save this token somewhere safe, as we will not show it to you again once you
              close this modal.
            </div>

            <span>It will expire on {newApiKeyDetails?.expiresAt?.toLocaleDateString()}</span>
          </div>
          {/* <ApiKeyDialogForm handleClose={() => setNewApiKeyModal(false)} /> */}
          <DialogFooter>
            <Button type="button" color="secondary" onClick={props.handleClose} tabIndex={-1}>
              {t("close")}
            </Button>
            {/* <Button type="submit" loading={form.formState.isSubmitting}>
              {t("save")}
            </Button> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Form
        data-testid="ApiKeyDialogForm"
        form={form}
        handleSubmit={async (event) => {
          const newApiKey = await utils.client.mutation("viewer.apiKeys.create", event);
          console.log("newApiKey", newApiKey);
          setNewApiKey(newApiKey);
          setNewApiKeyDetails({ ...event });
          await utils.invalidateQueries(["viewer.apiKeys.list"]);
          setSuccessfulNewApiKeyModal(true);
        }}
        className="space-y-4">
        <TextField
          label={t("personal_note")}
          {...form.register("note")}
          type="text"
          onChange={handleNoteChange}
        />

        <div className="flex flex-col">
          <div className="flex justify-between py-2">
            <span className="text-md text-gray-600">Expire date</span>
            <Controller
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <Switch
                  label={field.value ? t("never_expire_key_enabled") : t("never_expire_key_disabled")}
                  defaultChecked={field.value === null}
                  onCheckedChange={(isChecked) => {
                    const nullOrDate = () => {
                      if (isChecked === true) return null;
                      else return form.getValues().expiresAt;
                    };
                    form.setValue("expiresAt", nullOrDate());
                  }}
                />
              )}
            />
          </div>
          <DatePicker
            disabled={form.getValues().expiresAt === null}
            minDate={new Date()}
            date={selectedDate as Date}
            onDatesChange={handleDateChange}
          />
        </div>
        <div></div>
        <DialogFooter>
          <Button type="button" color="secondary" onClick={props.handleClose} tabIndex={-1}>
            {t("cancel")}
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t("save")}
          </Button>
        </DialogFooter>
      </Form>
    </>
  );
}
