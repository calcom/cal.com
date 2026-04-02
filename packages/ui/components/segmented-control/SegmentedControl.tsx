import classNames from "@calcom/ui/classNames";

export type SegmentedControlData<T extends string> = T | { value: T; label: string };

export interface SegmentedControlProps<T extends string> {
  data: SegmentedControlData<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

const SegmentedControl = <T extends string>({
  data,
  value,
  onChange,
  disabled = false,
  className,
  "data-testid": dataTestId,
  ...props
}: SegmentedControlProps<T>) => {
  const handleChange = (newValue: T) => {
    if (!disabled) {
      onChange(newValue);
    }
  };

  return (
    <div className={classNames("max-w-full", className)} data-testid={dataTestId} {...props}>
      <div
        className="no-scrollbar flex space-x-0.5 overflow-x-scroll rounded-lg bg-subtle p-0.5"
        role="radiogroup">
        {data.map((item, idx) => {
          const itemValue = typeof item === "string" ? item : item.value;
          const itemLabel = typeof item === "string" ? item : item.label;
          const isActive = value === itemValue;
          const inputId = `segmented-control-${itemValue}-${idx}`;

          return (
            <label
              key={itemValue}
              htmlFor={inputId}
              className={classNames(
                "inline-flex h-fit w-full items-center justify-center whitespace-nowrap rounded-lg p-1 text-md font-medium leading-none transition md:mb-0",
                "not-disabled:hover:shadow-outline-gray-hover not-disabled:active:shadow-outline-gray-active",
                isActive
                  ? "bg-default text-emphasis shadow-outline-gray-rested ring-inset ring-subtle"
                  : "text-subtle",
                disabled ? "pointer-events-none opacity-30" : "cursor-pointer"
              )}>
              <input
                type="radio"
                id={inputId}
                value={itemValue}
                checked={isActive}
                onChange={() => handleChange(itemValue)}
                disabled={disabled}
                className="sr-only"
                aria-checked={isActive}
              />
              <span>{itemLabel}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default SegmentedControl;
