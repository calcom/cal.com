"use client";

import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Form, Select, NumberInput } from "@calcom/ui/components/form";

import { useFilterValue, useDataTable } from "@calcom/features/data-table/hooks";
import type { FilterableColumn } from "@calcom/features/data-table/lib/types";
import { ZNumberFilterValue, ColumnFilterType } from "@calcom/features/data-table/lib/types";
import type { FilterType } from "@calcom/types/data-table";
import { numberFilterOperatorOptions } from "./utils";

export type NumberFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: Extract<FilterType, "n"> }>;
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
    <div className="mx-3 my-2" data-testid={`number-filter-options-${column.id}`}>
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
              <div className="flex items-center gap-2">
                <Select
                  data-testid={`number-filter-options-select-${column.id}`}
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
                <NumberInput className="h-[38px] basis-2/3" {...form.register("operand")} />
              </div>
            )}
          />

          <div className="bg-subtle -mx-3 my-2 h-px" role="separator" />

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
