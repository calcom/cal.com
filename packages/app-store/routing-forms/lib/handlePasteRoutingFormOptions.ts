import type { SelectOption } from "routing-forms/pages/form-edit/[...appPages]";

export const handlePasteRoutingFormOptions = (
  formattedPastedValues: SelectOption[],
  currentOptions: SelectOption[],
  index: number
) => {
  const updatedOptions = [...currentOptions];
  updatedOptions.splice(index, formattedPastedValues.length, ...formattedPastedValues);
  return updatedOptions;
};
