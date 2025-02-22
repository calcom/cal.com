import { useFormContext } from "react-hook-form";
import type { z } from "zod";

import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";

import type { fieldsSchema } from "./schema";

type RhfForm = {
  fields: z.infer<typeof fieldsSchema>;
};

type RhfFormFields = RhfForm["fields"];

type RhfFormField = RhfFormFields[number];

type FieldProps = Pick<
  RhfFormField,
  "name" | "type" | "disableOnPrefill" | "variantsConfig" | "optionsInputs"
>;

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
  const toPrefillValues = useRouterQuery();
  if (!field.disableOnPrefill) {
    return false;
  }
  // If the field is dirty, it means that some change has been made to the input by user, so we shouldn't disable it anymore
  // It avoids a scenario like this
  // 1. Input Prefilled and thus disabled
  // 2. User submits the form but error is shown for that field(as it was invalid value)
  // 3. Field is enabled back to correct the value
  // 3. User tries to correct the value and enters the previous value(partially typed) but input suddenly gets disabled
  if (formState.dirtyFields?.responses?.[field.name]) {
    return false;
  }

  const prefilledValues = getValues()?.responses || {};
  // radioInput and variantsConfig type fields have complex transformations, so we can't directly compare them with search params
  // e.g. name = John Doe in search params will be transformed to {firstName: John, lastName: Doe} and we can't directly compare it with toPrefill value
  const shouldMatchPrefilledValue = field.type !== "radioInput" && !field.variantsConfig;
  const errorMessage = (formState?.errors?.responses?.message || "") as string;
  const fieldNameThatHasError = getFieldNameFromErrorMessage(errorMessage);
  if (fieldNameThatHasError === field.name) {
    return false;
  }

  const searchParamValue = toPrefillValues[field.name];
  const prefilledValue = prefilledValues[field.name];

  if (!shouldMatchPrefilledValue) {
    // In this case we just ensure they have some values
    if (isValueSet(searchParamValue) && isValueSet(prefilledValue)) {
      if (field.type === "radioInput") {
        return hasValidRadioInputValue({ value: prefilledValue, optionsInputs: field.optionsInputs });
      }
      return true;
    }
  }

  if (!isValueSet(prefilledValue)) {
    return false;
  }

  if (!toPrefillValues) {
    // If there are no toPrefillValues, nothing can be prefilled and thus nothing should be disabled
    return false;
  }

  // If the specified prefill value is filled, then we disable the field. If it is changed due to some reason, then we don't disable the field
  if (searchParamValue == prefilledValue?.toString()) {
    return true;
  }

  return isEqual(searchParamValue, prefilledValue);

  function isValueSet(value: string | string[] | null | undefined): boolean {
    return value !== null && value !== undefined && value !== "";
  }

  function hasValidRadioInputValue({
    value,
    optionsInputs,
  }: {
    value: { optionValue: string; value: string };
    optionsInputs: Record<string, unknown> | undefined;
  }): boolean {
    const requiresOptionInputField = optionsInputs?.[value.value];
    if (!requiresOptionInputField) {
      return !!value.value;
    }

    return !!value.value && !!value.optionValue;
  }
};
