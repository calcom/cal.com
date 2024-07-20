import type z from "zod";

import { fieldTypesConfigMap } from "./fieldTypes";
import type { fieldSchema } from "./schema";

export const preprocessNameFieldDataWithVariant = (
  variantName: "fullName" | "firstAndLastName",
  value: string | Record<"firstName" | "lastName", string> | undefined
) => {
  // We expect an object here, but if we get a string, then we will try to transform it into the appropriate object
  if (variantName === "firstAndLastName") {
    return getFirstAndLastName(value);
    // We expect a string here, but if we get an object, then we will try to transform it into the appropriate string
  } else {
    return getFullName(value);
  }
};

export const getFullName = (name: string | { firstName: string; lastName?: string } | undefined) => {
  if (!name) {
    return "";
  }
  let nameString = "";
  if (typeof name === "string") {
    nameString = name;
  } else {
    nameString = name.firstName;
    if (name.lastName) {
      nameString = `${nameString} ${name.lastName}`;
    }
  }
  return nameString;
};

function getFirstAndLastName(value: string | Record<"firstName" | "lastName", string> | undefined) {
  let newValue: Record<"firstName" | "lastName", string>;
  value = value || "";
  if (typeof value === "string") {
    try {
      // Support name={"firstName": "John", "lastName": "Johny Janardan"} for prefilling
      newValue = JSON.parse(value);
    } catch (e) {
      // Support name="John Johny Janardan" to be filled as firstName="John" and lastName="Johny Janardan"
      const parts = value.split(" ").map((part) => part.trim());
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ");

      // If the value is not a valid JSON, then we will just use the value as is as it can be the full name directly
      newValue = { firstName, lastName };
    }
  } else {
    newValue = value;
  }
  return newValue;
}

/**
 * Get's the field's variantsConfig and if not available, then it will get the default variantsConfig from the fieldTypesConfigMap
 */
export const getVariantsConfig = (field: Pick<z.infer<typeof fieldSchema>, "variantsConfig" | "type">) => {
  const fieldVariantsConfig = field.variantsConfig;
  const fieldTypeConfig = fieldTypesConfigMap[field.type as keyof typeof fieldTypesConfigMap];

  if (!fieldTypeConfig) throw new Error(`Invalid field.type ${field.type}}`);

  const defaultVariantsConfig = fieldTypeConfig?.variantsConfig?.defaultValue;
  const variantsConfig = fieldVariantsConfig || defaultVariantsConfig;

  if (fieldTypeConfig.propsType === "variants" && !variantsConfig) {
    throw new Error(`propsType variants must have variantsConfig`);
  }
  return variantsConfig;
};

const validateCPF = (cpf: string) => {
  if (cpf.length !== 11) return false;

  const cpfArray = Array.from(cpf).map(Number);

  const [firstDigit, secondDigit] = cpfArray.slice(9);

  const isAllDigitsEqual = cpfArray.every((digit) => digit === cpfArray[0]);

  if (isAllDigitsEqual) return false;

  const calculateDigit = (slice: number) => {
    let sum = 0;
    let count = slice + 1;

    for (let i = 0; i < slice; i++) {
      sum += cpfArray[i] * count;
      count--;
    }

    const rest = sum % 11;

    return rest < 2 ? 0 : 11 - rest;
  };

  const firstDigitCalculated = calculateDigit(9);
  const secondDigitCalculated = calculateDigit(10);

  return firstDigit === firstDigitCalculated && secondDigit === secondDigitCalculated;
};

export const cpfMask = (value: string) => {
  const onlyNumbers = value.replace(/[^\d]/g, "");

  const cpfIsValid = validateCPF(onlyNumbers);

  const formatedCPF = onlyNumbers
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");

  return { isValid: cpfIsValid, value: formatedCPF };
};
