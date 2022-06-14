import { Root as ToggleGroupPrimitive, Item as ToggleGroupItemPrimitive } from "@radix-ui/react-toggle-group";

import classNames from "@calcom/lib/classNames";

export default function BooleanToggleGroup({ defaultValue, value, onValueChange }) {
  defaultValue = defaultValue || "yes";
  const yesNoValue = value === true ? "yes" : value === false ? "no" : defaultValue;
  return (
    <ToggleGroupPrimitive
      value={yesNoValue}
      type="single"
      className="rounded-sm"
      onValueChange={(value) => {
        const booleanValue = value === "yes" ? true : false;
        onValueChange(booleanValue);
      }}>
      <ToggleGroupItemPrimitive
        className={classNames(
          yesNoValue == "yes" ? "bg-gray-200" : "",
          "border border-gray-300 py-2 px-3 text-sm"
        )}
        value="yes">
        Yes
      </ToggleGroupItemPrimitive>
      <ToggleGroupItemPrimitive
        className={classNames(
          yesNoValue == "no" ? "bg-gray-200" : "",
          "border border-l-0 border-gray-300 py-2 px-3 text-sm"
        )}
        value="no">
        No
      </ToggleGroupItemPrimitive>
    </ToggleGroupPrimitive>
  );
}
