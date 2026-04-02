import { Dialog } from "@calcom/features/components/controlled-dialog";
import type { EventNameObjectType } from "@calcom/features/eventtypes/lib/eventNaming";
import { getEventName, validateCustomEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import type { InputClassNames } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { TextField } from "@calcom/ui/components/form";
import type { FC } from "react";
import type { SubmitHandler } from "react-hook-form";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

interface FormValues {
  customEventName: string;
}

export type CustomEventTypeModalClassNames = {
  eventNameInput?: InputClassNames;
  availableVariables?: {
    container?: string;
    header?: string;
    scrollArea?: string;
    variableItem?: {
      container?: string;
      variableName?: string;
      variableDescription?: string;
    };
    bookingFieldsHeader?: string;
    bookingFieldItem?: {
      container?: string;
      fieldName?: string;
      fieldValue?: string;
    };
  };
  previewSection?: {
    header?: string;
    previewContainer?: string;
    previewEventBox?: {
      container?: string;
      eventName?: string;
      eventTime?: string;
    };
  };
};

interface CustomEventTypeModalFormProps {
  placeHolder: string;
  close: () => void;
  setValue: (value: string) => void;
  event: EventNameObjectType;
  defaultValue: string;
  isNameFieldSplit: boolean;
  customClassNames?: CustomEventTypeModalClassNames;
}

const CustomEventTypeModalForm: FC<CustomEventTypeModalFormProps> = (props) => {
  const { t } = useLocale();
  const { placeHolder, close, setValue, event, isNameFieldSplit, customClassNames } = props;
  const { register, handleSubmit, watch, getValues } = useFormContext<FormValues>();
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    setValue(data.customEventName);
    close();
  };

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
        containerClassName={customClassNames?.eventNameInput?.container}
        labelClassName={customClassNames?.eventNameInput?.label}
        className={classNames("mb-0", customClassNames?.eventNameInput?.input)}
      />
      <div className="pt-6 text-sm">
        <div
          className={classNames(
            "bg-subtle mb-6 rounded-md p-2",
            customClassNames?.availableVariables?.container
          )}>
          <h1
            className={classNames(
              "text-emphasis mb-2 ml-1 font-medium",
              customClassNames?.availableVariables?.header
            )}>
            {t("available_variables")}
          </h1>
          <div
            className={classNames(
              "scroll-bar h-[216px] overflow-y-auto",
              customClassNames?.availableVariables?.scrollArea
            )}>
            <div
              className={classNames(
                "mb-2.5 flex items-start font-normal",
                customClassNames?.availableVariables?.variableItem?.container
              )}>
              <p
                className={classNames(
                  "text-subtle ml-1 mr-5 w-40 shrink-0",
                  customClassNames?.availableVariables?.variableItem?.variableName
                )}>
                {`{Event type title}`}
              </p>
              <p
                className={classNames(
                  "text-emphasis min-w-0 flex-1",
                  customClassNames?.availableVariables?.variableItem?.variableDescription
                )}>
                {t("event_name_info")}
              </p>
            </div>
            <div
              className={classNames(
                "mb-2.5 flex items-start font-normal",
                customClassNames?.availableVariables?.variableItem?.container
              )}>
              <p
                className={classNames(
                  "text-subtle ml-1 mr-5 w-40 shrink-0",
                  customClassNames?.availableVariables?.variableItem?.variableName
                )}>
                {`{Event duration}`}
              </p>
              <p
                className={classNames(
                  "text-emphasis min-w-0 flex-1",
                  customClassNames?.availableVariables?.variableItem?.variableDescription
                )}>
                {t("event_duration_info")}
              </p>
            </div>
            <div
              className={classNames(
                "mb-2.5 flex items-start font-normal",
                customClassNames?.availableVariables?.variableItem?.container
              )}>
              <p
                className={classNames(
                  "text-subtle ml-1 mr-5 w-40 shrink-0",
                  customClassNames?.availableVariables?.variableItem?.variableName
                )}>
                {`{Organiser}`}
              </p>
              <p
                className={classNames(
                  "text-emphasis min-w-0 flex-1",
                  customClassNames?.availableVariables?.variableItem?.variableDescription
                )}>
                {t("your_full_name")}
              </p>
            </div>
            <div
              className={classNames(
                "mb-2.5 flex items-start font-normal",
                customClassNames?.availableVariables?.variableItem?.container
              )}>
              <p
                className={classNames(
                  "text-subtle ml-1 mr-5 w-40 shrink-0",
                  customClassNames?.availableVariables?.variableItem?.variableName
                )}>
                {`{Organiser first name}`}
              </p>
              <p
                className={classNames(
                  "text-emphasis min-w-0 flex-1",
                  customClassNames?.availableVariables?.variableItem?.variableDescription
                )}>
                {t("organizer_first_name")}
              </p>
            </div>
            <div
              className={classNames(
                "mb-2.5 flex items-start font-normal",
                customClassNames?.availableVariables?.variableItem?.container
              )}>
              <p
                className={classNames(
                  "text-subtle ml-1 mr-5 w-40 shrink-0",
                  customClassNames?.availableVariables?.variableItem?.variableName
                )}>
                {`{Scheduler}`}
              </p>
              <p
                className={classNames(
                  "text-emphasis min-w-0 flex-1",
                  customClassNames?.availableVariables?.variableItem?.variableDescription
                )}>
                {t("scheduler_full_name")}
              </p>
            </div>
            <div
              className={classNames(
                "mb-2.5 flex items-start font-normal",
                customClassNames?.availableVariables?.variableItem?.container
              )}>
              <p
                className={classNames(
                  "text-subtle ml-1 mr-5 w-40 shrink-0",
                  customClassNames?.availableVariables?.variableItem?.variableName
                )}>
                {`{Scheduler first name}`}
              </p>
              <p
                className={classNames(
                  "text-emphasis min-w-0 flex-1",
                  customClassNames?.availableVariables?.variableItem?.variableDescription
                )}>
                {t("scheduler_first_name")}
              </p>
            </div>
            {isNameFieldSplit && (
              <div
                className={classNames(
                  "mb-2.5 flex items-start font-normal",
                  customClassNames?.availableVariables?.variableItem?.container
                )}>
                <p
                  className={classNames(
                    "text-subtle ml-1 mr-5 w-40 shrink-0",
                    customClassNames?.availableVariables?.variableItem?.variableName
                  )}>
                  {`{Scheduler last name}`}
                </p>
                <p
                  className={classNames(
                    "text-emphasis min-w-0 flex-1",
                    customClassNames?.availableVariables?.variableItem?.variableDescription
                  )}>
                  {t("scheduler_last_name")}
                </p>
              </div>
            )}
            <div
              className={classNames(
                "mb-2.5 flex items-start font-normal",
                customClassNames?.availableVariables?.variableItem?.container
              )}>
              <p
                className={classNames(
                  "text-subtle ml-1 mr-5 w-40 shrink-0",
                  customClassNames?.availableVariables?.variableItem?.variableName
                )}>
                {`{Location}`}
              </p>
              <p
                className={classNames(
                  "text-emphasis min-w-0 flex-1",
                  customClassNames?.availableVariables?.variableItem?.variableDescription
                )}>
                {t("location_info")}
              </p>
            </div>
            {/* Additional variable items here */}
            {event.bookingFields && (
              <p
                className={classNames(
                  "text-subtle mb-2 ml-1 font-medium",
                  customClassNames?.availableVariables?.bookingFieldsHeader
                )}>
                {t("booking_question_response_variables")}
              </p>
            )}
            {event.bookingFields &&
              Object.keys(event.bookingFields).map((bookingfield, index) => (
                <div
                  key={index}
                  className={classNames(
                    "mb-2.5 flex items-start font-normal",
                    customClassNames?.availableVariables?.bookingFieldItem?.container
                  )}>
                  <p
                    className={classNames(
                      "text-subtle ml-1 mr-5 w-40 shrink-0",
                      customClassNames?.availableVariables?.bookingFieldItem?.fieldName
                    )}>
                    {`{${bookingfield}}`}
                  </p>
                  <p
                    className={classNames(
                      "text-emphasis min-w-0 flex-1 capitalize",
                      customClassNames?.availableVariables?.bookingFieldItem?.fieldValue
                    )}>
                    {event.bookingFields?.[bookingfield]?.toString()}
                  </p>
                </div>
              ))}
          </div>
        </div>
        <h1
          className={classNames(
            "mb-2 text-[14px] font-medium leading-4",
            customClassNames?.previewSection?.header
          )}>
          {t("preview")}
        </h1>
        <div
          className={classNames(
            "flex h-[212px] w-full rounded-md border-y bg-cover bg-center dark:invert",
            customClassNames?.previewSection?.previewContainer
          )}
          style={{
            backgroundImage: "url(/calendar-preview.svg)",
          }}>
          <div className="m-auto flex items-center justify-center self-stretch">
            <div
              className={classNames(
                "bg-subtle ml-11 mt-3 box-border h-[110px] w-[120px] flex-col items-start gap-1 rounded-md border border-solid border-black text-[12px] leading-3",
                customClassNames?.previewSection?.previewEventBox?.container
              )}>
              <p
                className={classNames(
                  "text-emphasis overflow-hidden text-ellipsis p-1.5 font-medium",
                  customClassNames?.previewSection?.previewEventBox?.eventName
                )}>
                {previewText}
              </p>
              <p
                className={classNames(
                  "text-default ml-1.5 text-[10px] font-normal",
                  customClassNames?.previewSection?.previewEventBox?.eventTime
                )}>
                8 - 10 AM
              </p>
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
  customClassNames?: CustomEventTypeModalClassNames;
}

const CustomEventTypeModal: FC<CustomEventTypeModalProps> = (props) => {
  const { t } = useLocale();
  const { defaultValue, placeHolder, close, setValue, event, isNameFieldSplit, customClassNames } = props;

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
            customClassNames={customClassNames}
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
