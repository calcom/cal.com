import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";

import { PasswordField, InputField, Skeleton, Select, Label, Button } from "@calcom/ui";

export enum FormFieldTypes {
  PASSWORD = "PASSWORD",
  STRING = "STRING",
  SELECT = "SELECT",
}

interface FormFieldBase {
  name: string;
  label: string;
}

interface SelectField<SelectOption> extends FormFieldBase {
  type: FormFieldTypes.SELECT;
  options: SelectOption[];
}

interface TextField extends FormFieldBase {
  type: FormFieldTypes.PASSWORD | FormFieldTypes.STRING;
}
export type FormField<SelectOption> = SelectField<SelectOption> | TextField;

interface FormFieldRendererProps<SelectOption> {
  element: FormField<SelectOption>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any, any>;
  isLoading?: boolean;
  isLast?: boolean;
  showInternalButton?: boolean;
}

export const FormFieldRenderer = <SelectOption,>({
  element,
  form,
  isLoading,
  isLast,
  showInternalButton,
}: FormFieldRendererProps<SelectOption>) => {
  switch (element.type) {
    case FormFieldTypes.PASSWORD: {
      return (
        <Controller
          name={element.name}
          control={form.control}
          render={({ field: { onBlur, onChange, value } }) => {
            return (
              <div className="col-span-4 col-start-2 row-start-3 flex flex-row items-end space-x-5">
                <PasswordField
                  onChange={onChange}
                  onBlur={onBlur}
                  name={element.label}
                  value={value}
                  className="mb-0"
                  containerClassName="w-[100%] data-[dirty=true]:w-[90%] duration-300"
                />{" "}
                {isLast && showInternalButton && (
                  <Button
                    type="submit"
                    data-dirty={form.formState.isDirty}
                    className="mb-1 data-[dirty=false]:hidden "
                    loading={isLoading}>
                    Submit
                  </Button>
                )}
              </div>
            );
          }}
        />
      );
    }
    case FormFieldTypes.STRING: {
      return (
        <Controller
          name={element.name}
          control={form.control}
          render={({ field: { onBlur, onChange, value } }) => (
            <div className="col-span-4 col-start-2 row-start-2 flex flex-row items-end space-x-5">
              <InputField
                required
                onChange={onChange}
                onBlur={onBlur}
                value={value}
                name={element.label}
                className="mb-1"
                containerClassName="w-[100%]"
              />
              {isLast && showInternalButton && (
                <Button
                  type="submit"
                  data-dirty={form.formState.isDirty}
                  className="mb-1 data-[dirty=false]:hidden "
                  loading={isLoading}>
                  Submit
                </Button>
              )}
            </div>
          )}
        />
      );
    }
    case FormFieldTypes.SELECT: {
      return (
        <Controller
          name={element.name}
          control={form.control}
          render={({ field: { onBlur, onChange, value } }) => {
            return (
              <div className="col-span-4 col-start-2 row-start-3 flex flex-col items-start">
                <Skeleton as={Label} loadingClassName="w-16">
                  {element.label}
                </Skeleton>
                <div className="col-span-4 col-start-2 row-start-2 flex w-[100%] flex-row items-end space-x-5">
                  <Select
                    className="w-[100%] capitalize"
                    options={element.options}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                  />{" "}
                  {isLast && showInternalButton && (
                    <Button
                      type="submit"
                      data-dirty={form.formState.isDirty}
                      className="mb-0 data-[dirty=false]:hidden "
                      loading={isLoading}>
                      Submit
                    </Button>
                  )}
                </div>
              </div>
            );
          }}
        />
      );
    }
    default:
      return null;
  }
};
