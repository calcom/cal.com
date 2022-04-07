import dayjs from "dayjs";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { unknown } from "zod";

import { generateUniqueAPIKey } from "@calcom/ee/lib/api/apiKeys";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import Button from "@calcom/ui/Button";
import { DialogFooter } from "@calcom/ui/Dialog";
import Switch from "@calcom/ui/Switch";
import { FieldsetLegend, Form, InputGroupBox, TextArea, TextField } from "@calcom/ui/form/fields";

import { trpc } from "@lib/trpc";

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
      id: "",
      note: "" as string | undefined,
      expiresAt: "" as unknown as Date,
      neverExpires: true,
      hashedKey: "",
    } as Omit<TApiKeys, "userId" | "createdAt" | "lastUsedAt">,
  } = props;

  const [selectedDate, setSelectedDate] = useState(props?.defaultValues?.expiresAt);
  const [neverExpired, onNeverExpired] = useState(false);

  const handleDateChange = (e) => {
    setSelectedDate(e);
    form.setValue("expiresAt", e);
  };
  const form = useForm({
    defaultValues,
  });
  return (
    <Form
      data-testid="ApiKeyDialogForm"
      form={form}
      handleSubmit={async (event) => {
        await utils.client.mutation("viewer.apiKeys.create", event);
        await utils.invalidateQueries(["viewer.apiKeys.list"]);
        showToast(t("apiKeys_created_successfully"), "success");
        props.handleClose();
      }}
      className="space-y-4">
      <input type="hidden" {...form.register("id")} />

      <TextField
        label={t("personal_note")}
        {...form.register("note")}
        required
        type="text"
        onChange={handleNoteChange}
      />

      <div className="flex flex-col">
        <div className="flex justify-between py-2">
          <span className="text-md text-gray-600">Expire date</span>
          {/* <Switch label={"Never expire"} onCheckedChange={onNeverExpired} checked={neverExpired} />
          <Controller
            control={form.control}
            name="neverExpires"
            render={({ field }) => (
              <Switch
                label={field.value ? t("never_expire_key_enabled") : t("never_expire_key_disabled")}
                defaultChecked={field.value}
                onCheckedChange={(isChecked) => {
                  form.setValue("neverExpires", isChecked);
                }}
              />
            )}
          /> */}
        </div>
        <DatePicker
          // disabled={neverExpired}
          // minDate={new Date()}
          // {...form.register("expiresAt")}
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
  );
}
