import { useForm, Controller } from "react-hook-form";

import { Form, Input, Select, Button } from "@calcom/ui";

import type { FilterableColumn, TextFilterValue } from "./types";

export type TextFilterOperatorOption = {
  label: string;
  value: TextFilterOperator;
};

export const textFilterOperatorOptions: Array<TextFilterOperatorOption> = [
  // TODO: Translate
  { value: "equals", label: "Is" },
  { value: "notEquals", label: "Is not" },
  { value: "contains", label: "Contains" },
  { value: "notContains", label: "Does not contain" },
  { value: "startsWith", label: "Starts with" },
  { value: "endsWith", label: "Ends with" },
  { value: "isEmpty", label: "Is empty" },
  { value: "isNotEmpty", label: "Not empty" },
];

export type TextFilterOptionsProps = {
  column: FilterableColumn;
  filterValue?: TextFilterValue;
  setFilterValue: (value: TextFilterValue) => void;
  removeFilter: (columnId: string) => void;
};

export function TextFilterOptions({
  column,
  filterValue,
  setFilterValue,
  removeFilter,
}: TextFilterOptionsProps) {
  const form = useForm({
    defaultValues: {
      operatorOption: filterValue
        ? textFilterOperatorOptions.find((o) => o.value === filterValue.data.operator)
        : textFilterOperatorOptions[0],
      operand: filterValue?.data.operand || "",
    },
  });

  return (
    <div className="mx-3 my-2">
      <Form
        form={form}
        handleSubmit={({ operatorOption, operand }) => {
          setFilterValue({
            type: "text",
            data: {
              operator: operatorOption.value,
              operand,
            },
          });
        }}>
        <div>
          <Controller
            name="operatorOption"
            control={form.control}
            render={({ field: { value } }) => (
              <Select
                options={textFilterOperatorOptions}
                value={value}
                isSearchable={false}
                onChange={(event) => {
                  if (event) {
                    form.setValue("operatorOption", { ...event }, { shouldDirty: true });
                  }
                }}
              />
            )}
          />
          <Input className="mt-2" {...form.register("operand")} />

          <div className="bg-subtle -mx-3 mb-2 h-px" role="separator" />

          <div className="flex items-center justify-between">
            <Button
              type="button"
              color="secondary"
              disabled={form.formState.isSubmitting}
              onClick={() => removeFilter(column.id)}>
              Clear
            </Button>
            <Button
              type="submit"
              color="primary"
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}>
              Apply
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
