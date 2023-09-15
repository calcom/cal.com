export const getValidRhfFieldName = (fieldName: string) => {
  // Remember that any transformation that you do here would run on System Field names as well. So, be careful and avoiding doing anything here that would modify the SystemField names.
  // e.g. SystemField name currently have uppercases in them. So, no need to lowercase unless absolutely needed.
  return fieldName.replace(/[^a-zA-Z0-9]/g, "-");
};
