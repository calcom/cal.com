import { useAutoAnimate } from "@formkit/auto-animate/react";
import { EventTypeCustomInputType } from "@prisma/client";
import type { CustomInputParsed } from "pages/event-types/[type]";
import { FC } from "react";
import { Controller, SubmitHandler, useFieldArray, useForm, useWatch } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, Icon, Label, Select, TextField } from "@calcom/ui";

interface OptionTypeBase {
  label: string;
  value: EventTypeCustomInputType;
  options?: { label: string; type: string }[];
}

interface Props {
  onSubmit: SubmitHandler<IFormInput>;
  onCancel: () => void;
  selectedCustomInput?: CustomInputParsed;
}

type IFormInput = CustomInputParsed;

const CustomInputTypeForm: FC<Props> = (props) => {
  const { t } = useLocale();
  const inputOptions: OptionTypeBase[] = [
    { value: EventTypeCustomInputType.TEXT, label: t("text") },
    { value: EventTypeCustomInputType.TEXTLONG, label: t("multiline_text") },
    { value: EventTypeCustomInputType.NUMBER, label: t("number") },
    { value: EventTypeCustomInputType.BOOL, label: t("checkbox") },
    {
      value: EventTypeCustomInputType.RADIO,
      label: t("radio"),
    },
  ];
  const { selectedCustomInput } = props;
  const defaultValues = selectedCustomInput || { type: inputOptions[0].value };

  const { register, control, handleSubmit } = useForm<IFormInput>({
    defaultValues,
  });

  const selectedInputType = useWatch({ name: "type", control });
  const selectedInputOption = inputOptions.find((e) => selectedInputType === e.value);

  const onCancel = () => {
    props.onCancel();
  };

  return (
    <form
      id="custom-input-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(props.onSubmit)(e);
      }}
      className="flex flex-col space-y-4">
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700">
          {t("input_type")}
        </label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select
              id="type"
              defaultValue={selectedInputOption}
              options={inputOptions}
              isSearchable={false}
              className="mt-1 mb-2 block w-full min-w-0 flex-1  text-sm"
              onChange={(option) => option && field.onChange(option.value)}
              value={selectedInputOption}
              onBlur={field.onBlur}
              name={field.name}
            />
          )}
        />
      </div>
      <TextField
        label={t("label")}
        type="text"
        id="label"
        required
        className="block w-full rounded-sm border-gray-300 text-sm"
        defaultValue={selectedCustomInput?.label}
        {...register("label", { required: true })}
      />
      {(selectedInputType === EventTypeCustomInputType.TEXT ||
        selectedInputType === EventTypeCustomInputType.TEXTLONG) && (
        <TextField
          label={t("placeholder")}
          type="text"
          id="placeholder"
          className="block w-full rounded-sm border-gray-300 text-sm"
          defaultValue={selectedCustomInput?.placeholder}
          {...register("placeholder")}
        />
      )}
      {selectedInputType === EventTypeCustomInputType.RADIO && <RadioInputHandler />}

      <div className="flex h-5 items-center">
        <input
          id="required"
          type="checkbox"
          className="text-primary-600 focus:ring-primary-500 h-4 w-4 rounded border-gray-300 ltr:mr-2 rtl:ml-2"
          defaultChecked={selectedCustomInput?.required ?? true}
          {...register("required")}
        />
        <label htmlFor="required" className="block text-sm font-medium text-gray-700">
          {t("is_required")}
        </label>
      </div>
      <input
        type="hidden"
        id="eventTypeId"
        value={selectedCustomInput?.eventTypeId || -1}
        {...register("eventTypeId", { valueAsNumber: true })}
      />
      <input
        type="hidden"
        id="id"
        value={selectedCustomInput?.id || -1}
        {...register("id", { valueAsNumber: true })}
      />
      <div className="mt-5 flex justify-end space-x-2 sm:mt-4">
        <Button onClick={onCancel} type="button" color="secondary" className="ltr:mr-2">
          {t("cancel")}
        </Button>
        <Button type="submit" id="custom-input-form">
          {t("save")}
        </Button>
      </div>
    </form>
  );
};

function RadioInputHandler() {
  const { t } = useLocale();
  const { register, control } = useForm<IFormInput>();
  const { fields, append, remove } = useFieldArray<IFormInput>({
    control,
    name: "options",
  });
  const [animateRef] = useAutoAnimate<HTMLUListElement>();

  return (
    <div className="flex flex-col ">
      <Label htmlFor="radio_options">{t("options")}</Label>
      <ul
        className="flex max-h-80 w-full flex-col space-y-1 overflow-y-scroll rounded-md bg-gray-50 p-4"
        ref={animateRef}>
        <>
          {fields.map((option, index) => (
            <li key={`${option.label}-${index}`}>
              <TextField
                placeholder={t("enter_option", { index: index + 1 })}
                addOnFilled={false}
                label={t("option", { index: index + 1 })}
                labelSrOnly
                {...register(`options.${index}.label` as const, { required: true })}
                addOnSuffix={
                  <Button
                    size="icon"
                    color="minimal"
                    StartIcon={Icon.FiX}
                    onClick={() => {
                      remove(index);
                    }}
                  />
                }
              />
            </li>
          ))}
          <Button
            color="minimal"
            StartIcon={Icon.FiPlus}
            className="!text-sm !font-medium"
            onClick={() => {
              append({ label: "", type: "text" });
            }}>
            {t("add_an_option")}
          </Button>
        </>
      </ul>
    </div>
  );
}

export default CustomInputTypeForm;
