import type { FC } from "react";
import type { SubmitHandler } from "react-hook-form";
import { FormProvider } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";

import type { EventNameObjectType } from "@calcom/core/event";
import { getEventName } from "@calcom/core/event";
import { validateCustomEventName } from "@calcom/core/event";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Dialog, DialogClose, DialogFooter, DialogContent, TextField } from "@calcom/ui";

interface FormValues {
  customEventName: string;
}

interface CustomEventTypeModalFormProps {
  placeHolder: string;
  close: () => void;
  setValue: (value: string) => void;
  event: EventNameObjectType;
  defaultValue: string;
}

const CustomEventTypeModalForm: FC<CustomEventTypeModalFormProps> = (props) => {
  const { t } = useLocale();
  const { placeHolder, close, setValue, event } = props;
  const { register, handleSubmit, watch, getValues } = useFormContext<FormValues>();
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    setValue(data.customEventName);
    close();
  };

  // const customEventName = watch("customEventName");
  const previewText = getEventName({ ...event, eventName: watch("customEventName") });
  const placeHolder_ = watch("customEventName") === "" ? previewText : placeHolder;

  return (
    <form
      id="custom-event-name"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const isEmpty = getValues("customEventName") === "";
        if (isEmpty) {
          setValue("");
        }

        handleSubmit(onSubmit)(e);
      }}>
      <TextField
        label={t("event_name_in_calendar")}
        type="text"
        placeholder={placeHolder_}
        {...register("customEventName", {
          validate: (value) =>
            validateCustomEventName(value, t("invalid_event_name_variables"), event.bookingFields),
        })}
        className="mb-0"
      />
      <div className="pt-6 text-sm">
        <div className="mb-6 rounded-md bg-gray-100 p-2">
          <h1 className="mb-2 ml-1 font-medium text-gray-900">{t("available_variables")}</h1>
          <div className="mb-2.5 flex font-normal">
            <p className="ml-1 mr-5 w-28 text-gray-400">{`{Event type title}`}</p>
            <p className="text-gray-900">{t("event_name_info")}</p>
          </div>
          <div className="mb-2.5 flex font-normal">
            <p className="ml-1 mr-5 w-28 text-gray-400">{`{Organiser}`}</p>
            <p className="text-gray-900">{t("your_full_name")}</p>
          </div>
          <div className="mb-2.5 flex font-normal">
            <p className="ml-1 mr-5 w-28 text-gray-400">{`{Scheduler}`}</p>
            <p className="text-gray-900">{t("scheduler_full_name")}</p>
          </div>
          <div className="mb-1 flex font-normal">
            <p className="ml-1 mr-5 w-28 text-gray-400">{`{Location}`}</p>
            <p className="text-gray-900">{t("location_info")}</p>
          </div>
        </div>
        <h1 className="mb-2 text-[14px] font-medium leading-4">{t("preview")}</h1>
        <div
          className="flex h-[212px] w-full rounded-md border-y bg-cover bg-center"
          style={{
            backgroundImage: "url(/calendar-preview.svg)",
          }}>
          <div className="m-auto flex items-center justify-center self-stretch">
            <div className="mt-3 ml-11 box-border h-[110px] w-[120px] flex-col items-start gap-1 rounded-md border border-solid border-black bg-gray-100 text-[12px] leading-3">
              <p className="overflow-hidden text-ellipsis p-1.5 font-medium text-gray-900">{previewText}</p>
              <p className="ml-1.5 text-[10px] font-normal text-gray-600">8 - 10 AM</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

interface CustomEventTypeModalProps {
  placeHolder: string;
  defaultValue: string;
  close: () => void;
  setValue: (value: string) => void;
  event: EventNameObjectType;
}

const CustomEventTypeModal: FC<CustomEventTypeModalProps> = (props) => {
  const { t } = useLocale();

  const { defaultValue, placeHolder, close, setValue, event } = props;

  const methods = useForm<FormValues>({
    defaultValues: {
      customEventName: defaultValue,
    },
  });

  return (
    <Dialog open={true} onOpenChange={close}>
      <DialogContent
        title={t("custom_event_name")}
        description={t("custom_event_name_description")}
        type="creation"
        enableOverflow>
        <FormProvider {...methods}>
          <CustomEventTypeModalForm
            event={event}
            close={close}
            setValue={setValue}
            placeHolder={placeHolder}
            defaultValue={defaultValue}
          />
        </FormProvider>
        <DialogFooter>
          <DialogClose>{t("cancel")}</DialogClose>

          <Button form="custom-event-name" type="submit" color="primary">
            {t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomEventTypeModal;
