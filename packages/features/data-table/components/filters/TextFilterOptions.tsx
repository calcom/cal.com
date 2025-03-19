"use client";

import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Select } from "@calcom/ui/components/form";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
import { Input } from "@calcom/ui/components/form";

import { useFilterValue, useDataTable } from "../../hooks";
import type { FilterableColumn } from "../../lib/types";
import { ZTextFilterValue, ColumnFilterType } from "../../lib/types";
import { useTextFilterOperatorOptions } from "./utils";

export type TextFilterOptionsProps = {
  column: Extract<FilterableColumn, { type: ColumnFilterType.TEXT }>;
};

export function TextFilterOptions({ column }: TextFilterOptionsProps) {
  const { t } = useLocale();
  const textFilterOperatorOptions = useTextFilterOperatorOptions();
  const filterValue = useFilterValue(column.id, ZTextFilterValue);
  const { updateFilter, removeFilter } = useDataTable();

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
            updateFilter(column.id, {
              type: ColumnFilterType.TEXT,
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
