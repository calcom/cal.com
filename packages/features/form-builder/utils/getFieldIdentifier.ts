import { getValidRhfFieldName } from "@calcom/lib/getValidRhfFieldName";

export const getFieldIdentifier = (name: string) => {
  return getValidRhfFieldName(name);
};
