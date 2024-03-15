import type { FieldValues, UseFormReturn } from "react-hook-form";

export const isFormDisabled = <T extends FieldValues>(genericFormMethod: UseFormReturn<T>): boolean =>
  genericFormMethod.formState.isSubmitting || !genericFormMethod.formState.isDirty;
