import { useId } from "@radix-ui/react-id";
import { Root as ToggleGroupPrimitive, Item as ToggleGroupItemPrimitive } from "@radix-ui/react-toggle-group";
import { useState } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Label } from "../../../components/form/inputs/Label";

const boolean = (yesNo: "yes" | "no") => (yesNo === "yes" ? true : yesNo === "no" ? false : undefined);
const yesNo = (boolean?: boolean) => (boolean === true ? "yes" : boolean === false ? "no" : undefined);

export const BooleanToggleGroup = function BooleanToggleGroup({
  defaultValue = true,
  value,
  disabled = false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onValueChange = () => {},
  ...passThrough
}: {
  defaultValue?: boolean;
  value?: boolean;
  onValueChange?: (value?: boolean) => void;
  disabled?: boolean;
}) {
  // Maintain a state because it is not necessary that onValueChange the parent component would re-render. Think react-hook-form
  // Also maintain a string as boolean isn't accepted as ToggleGroupPrimitive value
  const [yesNoValue, setYesNoValue] = useState<"yes" | "no" | undefined>(yesNo(value));

  if (!yesNoValue) {
    setYesNoValue(yesNo(defaultValue));
    onValueChange(defaultValue);
    return null;
  }
  const commonClass = classNames(
    "w-full inline-flex items-center justify-center rounded py-[10px] px-4 text-sm font-medium  leading-4",
    disabled && "cursor-not-allowed"
  );
  const selectedClass = classNames(commonClass, "bg-emphasis  text-emphasis");
  const unselectedClass = classNames(commonClass, "text-default hover:bg-subtle hover:text-emphasis");
  return (
    <ToggleGroupPrimitive
      value={yesNoValue}
      type="single"
      disabled={disabled}
      className="border-subtle flex h-9 space-x-2 rounded-md border p-1 rtl:space-x-reverse"
      onValueChange={(yesNoValue: "yes" | "no") => {
        setYesNoValue(yesNoValue);
        onValueChange(boolean(yesNoValue));
      }}
      {...passThrough}>
      <ToggleGroupItemPrimitive
        className={classNames(boolean(yesNoValue) ? selectedClass : unselectedClass)}
        disabled={disabled}
        value="yes">
        Yes
      </ToggleGroupItemPrimitive>

      <ToggleGroupItemPrimitive
        disabled={disabled}
        className={classNames(!boolean(yesNoValue) ? selectedClass : unselectedClass)}
        value="no">
        No
      </ToggleGroupItemPrimitive>
    </ToggleGroupPrimitive>
  );
};

export const BooleanToggleGroupField = function BooleanToggleGroupField(
  props: Parameters<typeof BooleanToggleGroup>[0] & {
    label?: string;
    containerClassName?: string;
    name?: string;
    labelProps?: React.ComponentProps<typeof Label>;
    className?: string;
    error?: string;
  }
) {
  const { t } = useLocale();
  const { label = t(props.name || ""), containerClassName, labelProps, className, ...passThrough } = props;
  const id = useId();
  return (
    <div className={classNames(containerClassName)}>
      <div className={className}>
        {!!label && (
          <Label htmlFor={id} {...labelProps} className={classNames(props.error && "text-error", "mt-4")}>
            {label}
          </Label>
        )}
      </div>
      <BooleanToggleGroup {...passThrough} />
    </div>
  );
};
