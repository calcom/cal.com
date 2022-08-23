import { Root as ToggleGroupPrimitive, Item as ToggleGroupItemPrimitive } from "@radix-ui/react-toggle-group";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";

const boolean = (yesNo: "yes" | "no") => (yesNo === "yes" ? true : yesNo === "no" ? false : undefined);
const yesNo = (boolean?: boolean) => (boolean === true ? "yes" : boolean === false ? "no" : undefined);

export default function BooleanToggleGroup({
  defaultValue = true,
  value,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onValueChange = () => {},
}: {
  defaultValue?: boolean;
  value?: boolean;
  onValueChange?: (value?: boolean) => void;
}) {
  // Maintain a state because it is not necessary that onValueChange the parent component would re-render. Think react-hook-form
  // Also maintain a string as boolean isn't accepted as ToggleGroupPrimitive value
  const [yesNoValue, setYesNoValue] = useState<"yes" | "no" | undefined>(yesNo(value));

  if (!yesNoValue) {
    setYesNoValue(yesNo(defaultValue));
    onValueChange(defaultValue);
    return null;
  }

  return (
    <ToggleGroupPrimitive
      value={yesNoValue}
      type="single"
      className="rounded-sm"
      onValueChange={(yesNoValue: "yes" | "no") => {
        setYesNoValue(yesNoValue);
        onValueChange(boolean(yesNoValue));
      }}>
      <ToggleGroupItemPrimitive
        className={classNames(
          boolean(yesNoValue) ? "bg-gray-200" : "",
          "border border-gray-300 py-2 px-3 text-sm"
        )}
        value="yes">
        Yes
      </ToggleGroupItemPrimitive>
      <ToggleGroupItemPrimitive
        className={classNames(
          !boolean(yesNoValue) ? "bg-gray-200" : "",
          "border border-l-0 border-gray-300 py-2 px-3 text-sm"
        )}
        value="no">
        No
      </ToggleGroupItemPrimitive>
    </ToggleGroupPrimitive>
  );
}
