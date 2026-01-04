import type { NumberFilterOperator, TextFilterOperator } from "../../lib/types";

export type NumberFilterOperatorOption = {
  label: string;
  value: NumberFilterOperator;
};

export type TextFilterOperatorOption = {
  label: string;
  value: TextFilterOperator;
  requiresOperand: boolean;
};
