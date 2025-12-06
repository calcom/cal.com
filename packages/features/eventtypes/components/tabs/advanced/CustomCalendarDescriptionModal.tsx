import type { FC } from "react";
import type { SubmitHandler } from "react-hook-form";
import { FormProvider } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import type { EventNameObjectType } from "@calcom/features/eventtypes/lib/eventNaming";
import { getEventName, validateCustomEventName } from "@calcom/features/eventtypes/lib/eventNaming";
import type { InputClassNames } from "@calcom/features/eventtypes/lib/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
import { TextAreaField } from "@calcom/ui/components/form";

interface FormValues {
  customCalendarDescription: string;
}

export type CustomCalendarDescriptionModalClassNames = {
  descriptionInput?: InputClassNames;
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
  };
};

interface CustomCalendarDescriptionModalFormProps {
  placeHolder: string;
  close: () => void;
  setValue: (value: string) => void;
  event: EventNameObjectType;
  defaultValue: string;
  isNameFieldSplit: boolean;
  customClassNames?: CustomCalendarDescriptionModalClassNames;
}

const CustomCalendarDescriptionModalForm: FC<CustomCalendarDescriptionModalFormProps> = (props) => {
  const { t } = useLocale();
  const { placeHolder, close, setValue, event, isNameFieldSplit, customClassNames } = props;
  const { register, handleSubmit, watch, getValues } = useFormContext<FormValues>();
  const onSubmit: SubmitHandler<FormValues> = (data) => {
    setValue(data.customCalendarDescription);
    close();
  };

  const currentValue = watch("customCalendarDescription");
  const previewText = currentValue
    ? getEventName({ ...event, eventName: currentValue })
    : placeHolder;

  return (
    <form
      id="custom-calendar-description"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const isEmpty = getValues("customCalendarDescription") === "";
        if (isEmpty) {
          setValue("");
        }
        handleSubmit(onSubmit)(e);
      }}>
      <TextAreaField
        label={t("calendar_event_description")}
        placeholder={placeHolder}
        rows={4}
        {...register("customCalendarDescription", {
          validate: (value) => {
            const validationResult = validateCustomEventName(value, event.bookingFields);
            return typeof validationResult === "string"
              ? t("invalid_event_name_variables", { item: validationResult })
              : validationResult;
          },
        })}
        className={classNames("mb-0", customClassNames?.descriptionInput?.input)}
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
            "bg-subtle rounded-md border p-4",
            customClassNames?.previewSection?.previewContainer
          )}>
          <p className="text-emphasis whitespace-pre-wrap text-sm">{previewText}</p>
        </div>
      </div>
    </form>
  );
};

interface CustomCalendarDescriptionModalProps {
  placeHolder: string;
  defaultValue: string;
  close: () => void;
  setValue: (value: string) => void;
  event: EventNameObjectType;
  isNameFieldSplit: boolean;
  customClassNames?: CustomCalendarDescriptionModalClassNames;
}

const CustomCalendarDescriptionModal: FC<CustomCalendarDescriptionModalProps> = (props) => {
  const { t } = useLocale();
  const { defaultValue, placeHolder, close, setValue, event, isNameFieldSplit, customClassNames } = props;

  const methods = useForm<FormValues>({
    defaultValues: {
      customCalendarDescription: defaultValue,
    },
  });

  return (
    <Dialog open={true} onOpenChange={close}>
      <DialogContent
        title={t("custom_calendar_description")}
        description={t("custom_calendar_description_modal_description")}
        type="creation"
        enableOverflow>
        <FormProvider {...methods}>
          <CustomCalendarDescriptionModalForm
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
          <Button form="custom-calendar-description" type="submit" color="primary">
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomCalendarDescriptionModal;
