import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Form, Input, Select, Button } from "@calcom/ui";

import type { FilterableColumn, TextFilterValue, TextFilterOperator } from "../../lib/types";

export type TextFilterOperatorOption = {
  label: string;
  value: TextFilterOperator;
  requiresOperand: boolean;
};

const useTextFilterOperatorOptions = (): TextFilterOperatorOption[] => {
  const { t } = useLocale();
  return [
    { value: "equals", label: t("filter_operator_is"), requiresOperand: true },
    { value: "notEquals", label: t("filter_operator_is_not"), requiresOperand: true },
    { value: "contains", label: t("filter_operator_contains"), requiresOperand: true },
    { value: "notContains", label: t("filter_operator_does_not_contain"), requiresOperand: true },
    { value: "startsWith", label: t("filter_operator_starts_with"), requiresOperand: true },
    { value: "endsWith", label: t("filter_operator_ends_with"), requiresOperand: true },
    { value: "isEmpty", label: t("filter_operator_is_empty"), requiresOperand: false },
    { value: "isNotEmpty", label: t("filter_operator_not_empty"), requiresOperand: false },
  ];
};

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
  const { t } = useLocale();
  const textFilterOperatorOptions = useTextFilterOperatorOptions();

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
          if (operatorOption) {
            setFilterValue({
              type: "text",
              data: {
                operator: operatorOption.value,
                operand: operatorOption.requiresOperand ? operand : "",
              },
            });
          }
        }}>
        <div>
          <Controller
            name="operatorOption"
            control={form.control}
            render={({ field: { value } }) => (
              <>
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
                {value?.requiresOperand && <Input className="mt-2" {...form.register("operand")} />}
              </>
            )}
          />

          <div className="bg-subtle -mx-3 mb-2 h-px" role="separator" />

          <div className="flex items-center justify-between">
            <Button
              type="button"
              color="secondary"
              disabled={form.formState.isSubmitting}
              onClick={() => removeFilter(column.id)}>
              {t("clear")}
            </Button>
            <Button
              type="submit"
              color="primary"
              loading={form.formState.isSubmitting}
              disabled={form.formState.isSubmitting}>
              {t("apply")}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
