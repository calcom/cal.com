import { EventTypeCustomInputType } from "@prisma/client";
import { UseFormReturn } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs } from "@calcom/trpc/react";
import { Group, Label, RadioField, TextAreaField, TextField, PhoneInput } from "@calcom/ui";
import { FiInfo } from "@calcom/ui/components/icon";

import { BookingFormValues } from "./form-config";

type CustomInputFieldsProps = {
  inputs: NonNullable<RouterOutputs["viewer"]["public"]["event"]>["customInputs"];
  bookingForm: UseFormReturn<BookingFormValues>;
  isRescheduling?: boolean;
};

type FieldProps = CustomInputFieldsProps["inputs"][number] & {
  bookingForm: CustomInputFieldsProps["bookingForm"];
  isRescheduling?: boolean;
};

const InputTextLong = ({ id, required, placeholder, label, bookingForm, isRescheduling }: FieldProps) => (
  <TextAreaField
    label={label}
    {...bookingForm.register(`customInputs.${id}`, {
      required: required,
    })}
    required={required}
    id={"custom_" + id}
    rows={3}
    placeholder={placeholder}
    disabled={isRescheduling}
  />
);

const InputText = ({ bookingForm, id, required, placeholder, label, isRescheduling }: FieldProps) => (
  <TextField
    type="text"
    label={label}
    {...bookingForm.register(`customInputs.${id}`, {
      required: required,
    })}
    required={required}
    id={"custom_" + id}
    placeholder={placeholder}
    disabled={isRescheduling}
  />
);

const InputNumber = ({ bookingForm, id, required, placeholder, label, isRescheduling }: FieldProps) => (
  <TextField
    type="number"
    label={label}
    {...bookingForm.register(`customInputs.${id}`, {
      required: required,
    })}
    required={required}
    id={"custom_" + id}
    placeholder={placeholder}
    disabled={isRescheduling}
  />
);

const InputBoolean = ({ bookingForm, id, required, label, isRescheduling }: FieldProps) => (
  <div className="my-6">
    <div className="flex">
      <TextField
        type="checkbox"
        {...bookingForm.register(`customInputs.${id}`, {
          required: required,
        })}
        required={required}
        id={"custom_" + id}
        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black disabled:bg-gray-200 ltr:mr-2 rtl:ml-2 disabled:dark:text-gray-500"
        placeholder=""
        disabled={isRescheduling}
      />
      <Label htmlFor={"custom_" + id}>{label}</Label>
    </div>
  </div>
);

const InputRadio = ({ bookingForm, id, required, label, options, isRescheduling }: FieldProps) => {
  const { t } = useLocale();
  return (
    <div className="flex">
      <Label htmlFor={"customInputs." + id}>{label}</Label>
      <Group
        name={`customInputs.${id}`}
        id={`customInputs.${id}`}
        required={required}
        onValueChange={(e) => {
          bookingForm.setValue(`customInputs.${id}`, e);
        }}>
        <>
          {!!options &&
            options.map((option, i) => (
              <RadioField
                label={option.label}
                key={`option.${id}.${i}.radio`}
                value={option.label}
                id={`option.${id}.${i}.radio`}
                disabled={isRescheduling}
              />
            ))}
        </>
        {bookingForm.formState.errors.customInputs?.[id] && (
          <div className="mt-px flex items-center text-xs text-red-700 ">
            <p>{t("required")}</p>
          </div>
        )}
      </Group>
    </div>
  );
};

const InputPhone = ({ bookingForm, id, required, label, isRescheduling }: FieldProps) => {
  const { t } = useLocale();
  return (
    <div>
      <Label htmlFor={"customInputs." + id}>{label}</Label>
      <PhoneInput<BookingFormValues>
        name={`customInputs.${id}`}
        control={bookingForm.control}
        placeholder={t("enter_phone_number")}
        id={`customInputs.${id}`}
        required={required}
        disabled={isRescheduling}
      />
      {bookingForm.formState.errors?.customInputs?.[id] && (
        <div className="mt-2 flex items-center text-sm text-red-700 ">
          <FiInfo className="h-3 w-3 ltr:mr-2 rtl:ml-2" />
          <p>{t("invalid_number")}</p>
        </div>
      )}
    </div>
  );
};

export const CustomInputFields = ({ inputs, bookingForm, isRescheduling }: CustomInputFieldsProps) => {
  return (
    <>
      {inputs
        .sort((inputA, inputB) => inputA.id - inputB.id)
        .map((input) => (
          <div key={input.id}>
            {input.type === EventTypeCustomInputType.TEXTLONG && (
              <InputTextLong {...input} isRescheduling={isRescheduling} bookingForm={bookingForm} />
            )}
            {input.type === EventTypeCustomInputType.TEXT && (
              <InputText {...input} isRescheduling={isRescheduling} bookingForm={bookingForm} />
            )}
            {input.type === EventTypeCustomInputType.NUMBER && (
              <InputNumber {...input} isRescheduling={isRescheduling} bookingForm={bookingForm} />
            )}
            {input.type === EventTypeCustomInputType.BOOL && (
              <InputBoolean {...input} isRescheduling={isRescheduling} bookingForm={bookingForm} />
            )}
            {input.options && input.type === EventTypeCustomInputType.RADIO && (
              <InputRadio {...input} isRescheduling={isRescheduling} bookingForm={bookingForm} />
            )}
            {input.type === EventTypeCustomInputType.PHONE && (
              <InputPhone {...input} isRescheduling={isRescheduling} bookingForm={bookingForm} />
            )}
          </div>
        ))}
    </>
  );
};
