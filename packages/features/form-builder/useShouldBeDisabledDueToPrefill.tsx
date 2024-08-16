import { useFormContext } from "react-hook-form";
import type { z } from "zod";

import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";

import type { fieldsSchema } from "./schema";

type RhfForm = {
  fields: z.infer<typeof fieldsSchema>;
};

type RhfFormFields = RhfForm["fields"];

type RhfFormField = RhfFormFields[number];

type FieldProps = Pick<RhfFormField, "name" | "disableOnPrefill">;

export const getFieldNameFromErrorMessage = (errorMessage: string): string => {
  const name = errorMessage?.replace(/\{([^}]+)\}.*/, "$1");
  return name;
};

function toArray(value: string[] | string): string[] {
  return Array.isArray(value) ? value : [value];
}

function intersected(arr1: string[], arr2: string[]): boolean {
  return !!arr1.find((value) => arr2.find((innerValue) => innerValue?.toString() == value?.toString()));
}

function isEqual(searchParamValue: string | string[], formValue: string[] | string): boolean {
  if (typeof formValue === "string") {
    return searchParamValue?.toString() == formValue?.toString();
  }

  const formValueToArray = toArray(formValue as string | string[]);
  const urlValueToArray = toArray(searchParamValue);

  return intersected(formValueToArray, urlValueToArray);
}

export const useShouldBeDisabledDueToPrefill = (field: FieldProps): boolean => {
  const { getValues, formState } = useFormContext();
  const searchParams = useRouterQuery();
  const formValues = getValues()?.responses || {};

  const errorMessage = (formState?.errors?.responses?.message || "") as string;
  const fieldNameThatHasError = getFieldNameFromErrorMessage(errorMessage);
  if (fieldNameThatHasError === field.name) {
    return false;
  }

  const fieldValueInForm = formValues[field.name];
  const isFieldValueNotSet =
    fieldValueInForm === null || fieldValueInForm === undefined || fieldValueInForm === "";

  if (isFieldValueNotSet) {
    // We don't want to disable a field, that isn't filled
    return false;
  }

  if (!field.disableOnPrefill || !searchParams) {
    // If there are no searchParams, nothing can be prefilled and thus nothing should be disabled
    return false;
  }

  const searchParamValue = searchParams[field.name];

  // If the specified prefill value is filled, then we disable the field. If it is changed due to some reason, then we don't disable the field
  if (searchParamValue == fieldValueInForm?.toString()) {
    return true;
  }

  return isEqual(searchParamValue, fieldValueInForm);
};
