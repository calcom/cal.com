import { useFormContext } from "react-hook-form";

import type { RhfFormField } from "./types";
import { useRouterQuery } from "./useRouterQuery";

export const getFieldNameFromErrorMessage = (errorMessage: string): string => {
  const name = errorMessage?.replace(/\{([^}]+)\}.*/, "$1");
  return name;
};

export const useShouldBeDisabledDueToPrefill = (field: RhfFormField): boolean => {
  const { formState } = useFormContext();
  const searchParams = useRouterQuery();
  // Get the value of a specific field
  const errorMessage = (formState?.errors?.responses?.message || "") as string;
  const name = getFieldNameFromErrorMessage(errorMessage);
  // If a field is prefilled via the URL and an error occurs upon form submission, we should not disable the field.
  if (!field) {
    return false;
  }
  if (name === field?.name) {
    return false;
  }

  if (!field.disableOnPrefill || !searchParams) {
    return false;
  }

  return !!searchParams[field.name];
};
