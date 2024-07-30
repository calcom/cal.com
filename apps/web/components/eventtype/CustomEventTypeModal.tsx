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
  isNameFieldSplit: boolean;
}

const CustomEventTypeModalForm: FC<CustomEventTypeModalFormProps> = (props) => {
  const { t } = useLocale();
  const { placeHolder, close, setValue, event, isNameFieldSplit } = props;
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
          validate: (value) => {
            const validationResult = validateCustomEventName(value, event.bookingFields);
            return typeof validationResult === "string"
              ? t("invalid_event_name_variables", { item: validationResult })
              : validationResult;
          },
        })}
        className="mb-0"
      />
      <div className="pt-6 text-sm">
        <div className="bg-subtle mb-6 rounded-md p-2">
          <h1 className="text-emphasis mb-2 ml-1 font-medium">{t("available_variables")}</h1>
          <div className="scroll-bar h-[216px] overflow-y-auto">
            <div className="mb-2.5 flex font-normal">
              <p className="text-subtle ml-1 mr-5 w-32">{`{Event type title}`}</p>
              <p className="text-emphasis">{t("event_name_info")}</p>
            </div>
            <div className="mb-2.5 flex font-normal">
              <p className="text-subtle ml-1 mr-5 w-32">{`{Organiser}`}</p>
              <p className="text-emphasis">{t("your_full_name")}</p>
            </div>
            <div className="mb-2.5 flex font-normal">
              <p className="text-subtle ml-1 mr-5 w-32">{`{Organiser first name}`}</p>
              <p className="text-emphasis">{t("organizer_first_name")}</p>
            </div>
            <div className="mb-2.5 flex font-normal">
              <p className="text-subtle ml-1 mr-5 w-32">{`{Scheduler}`}</p>
              <p className="text-emphasis">{t("scheduler_full_name")}</p>
            </div>
            {isNameFieldSplit && (
              <div className="mb-2.5 flex font-normal">
                <p className="text-subtle ml-1 mr-5 w-32">{`{Scheduler first name}`}</p>
                <p className="text-emphasis">{t("scheduler_first_name")}</p>
              </div>
            )}
            {isNameFieldSplit && (
              <div className="mb-2.5 flex font-normal">
                <p className="text-subtle ml-1 mr-5 w-32">{`{Scheduler last name}`}</p>
                <p className="text-emphasis">{t("scheduler_last_name")}</p>
              </div>
            )}
            <div className="mb-2.5 flex font-normal">
              <p className="text-subtle ml-1 mr-5 w-32">{`{Location}`}</p>
              <p className="text-emphasis">{t("location_info")}</p>
            </div>
            {event.bookingFields && (
              <p className="text-subtle mb-2 ml-1 font-medium">{t("booking_question_response_variables")}</p>
            )}
            {event.bookingFields &&
              Object.keys(event.bookingFields).map((bookingfield, index) => (
                <div key={index} className="mb-2.5 flex font-normal">
                  <p className="text-subtle ml-1 mr-5 w-32">{`{${bookingfield}}`}</p>
                  <p className="text-emphasis capitalize">
                    {event.bookingFields?.[bookingfield]?.toString()}
                  </p>
                </div>
              ))}
          </div>
        </div>
        <h1 className="mb-2 text-[14px] font-medium leading-4">{t("preview")}</h1>
        <div
          className="flex h-[212px] w-full rounded-md border-y bg-cover bg-center dark:invert"
          style={{
            backgroundImage: "url(/calendar-preview.svg)",
          }}>
          <div className="m-auto flex items-center justify-center self-stretch">
            <div className="bg-subtle ml-11 mt-3 box-border h-[110px] w-[120px] flex-col items-start gap-1 rounded-md border border-solid border-black text-[12px] leading-3">
              <p className="text-emphasis overflow-hidden text-ellipsis p-1.5 font-medium">{previewText}</p>
              <p className="text-default ml-1.5 text-[10px] font-normal">8 - 10 AM</p>
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
  isNameFieldSplit: boolean;
}

const CustomEventTypeModal: FC<CustomEventTypeModalProps> = (props) => {
  const { t } = useLocale();

  const { defaultValue, placeHolder, close, setValue, event, isNameFieldSplit } = props;

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
            isNameFieldSplit={isNameFieldSplit}
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
