"use client";

import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Form, Input, Select, Button } from "@calcom/ui";

import { useFilterValue, useDataTable } from "../../hooks";
import type { FilterableColumn, NumberFilterOperator } from "../../lib/types";
import { ZNumberFilterValue, ColumnFilterType } from "../../lib/types";

export type NumberFilterOperatorOption = {
  label: string;
  value: NumberFilterOperator;
};

const numberFilterOperatorOptions: NumberFilterOperatorOption[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
];

export type NumberFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: ColumnFilterType.NUMBER }>;
};

export function NumberFilterOptions({ column }: NumberFilterOptionsProps) {
  const { t } = useLocale();
  const filterValue = useFilterValue(column.id, ZNumberFilterValue);
  const { updateFilter, removeFilter } = useDataTable();

  const form = useForm({
    defaultValues: {
      operatorOption: filterValue
        ? numberFilterOperatorOptions.find((o) => o.value === filterValue.data.operator)
        : numberFilterOperatorOptions[0],
      operand: filterValue?.data.operand || "",
    },
  });

  return (
    <div className="mx-3 my-2">
      <Form
        form={form}
        handleSubmit={({ operatorOption, operand }) => {
          if (operatorOption) {
            updateFilter(column.id, {
              type: ColumnFilterType.NUMBER,
              data: {
                operator: operatorOption.value,
                operand: Number(operand),
              },
            });
          }
        }}>
        <div>
          <Controller
            name="operatorOption"
            control={form.control}
            render={({ field: { value } }) => (
              <div className="-mt-2 flex items-center gap-2">
                <Select
                  className="basis-1/3"
                  options={numberFilterOperatorOptions}
                  value={value}
                  isSearchable={false}
                  onChange={(event) => {
                    if (event) {
                      form.setValue("operatorOption", { ...event }, { shouldDirty: true });
                    }
                  }}
                />
                <Input type="number" className="mt-2 basis-2/3" {...form.register("operand")} />
              </div>
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
