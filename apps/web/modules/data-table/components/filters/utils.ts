import { useLocale } from "@calcom/lib/hooks/useLocale";

import { type TextFilterOperator, textFilterOperators } from "../../lib/types";
import type { TextFilterOperatorOption, NumberFilterOperatorOption } from "./types";

export const numberFilterOperatorOptions: NumberFilterOperatorOption[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "≠" },
  { value: "gt", label: ">" },
  { value: "gte", label: "≥" },
  { value: "lt", label: "<" },
  { value: "lte", label: "≤" },
];

export const useTextFilterOperatorOptions = (
  allowedOperators?: TextFilterOperator[]
): TextFilterOperatorOption[] => {
  const { t } = useLocale();
  const operators = allowedOperators ?? textFilterOperators;
  const options = [
    { value: "equals", label: t("filter_operator_is"), requiresOperand: true },
    { value: "notEquals", label: t("filter_operator_is_not"), requiresOperand: true },
    { value: "contains", label: t("filter_operator_contains"), requiresOperand: true },
    { value: "notContains", label: t("filter_operator_does_not_contain"), requiresOperand: true },
    { value: "startsWith", label: t("filter_operator_starts_with"), requiresOperand: true },
    { value: "endsWith", label: t("filter_operator_ends_with"), requiresOperand: true },
    { value: "isEmpty", label: t("filter_operator_is_empty"), requiresOperand: false },
    { value: "isNotEmpty", label: t("filter_operator_not_empty"), requiresOperand: false },
  ];
  return options.filter((opt): opt is TextFilterOperatorOption =>
    operators.includes(opt.value as TextFilterOperator)
  );
};
