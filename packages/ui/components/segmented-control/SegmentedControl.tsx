import classNames from "@calcom/ui/classNames";

export type SegmentedControlData = string | { value: string; label: string };

export interface SegmentedControlProps {
    data: SegmentedControlData[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    className?: string;
    "data-testid"?: string;
}

const SegmentedControl = function ({
    data,
    value,
    onChange,
    disabled = false,
    className,
    "data-testid": dataTestId,
    ...props
}: SegmentedControlProps) {
    const handleChange = (newValue: string) => {
        if (!disabled) {
            onChange(newValue);
        }
    };

    return (
        <div
            className={classNames("max-w-full", className)}
            data-testid={dataTestId}
            {...props}>
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
                                isActive
                                    ? "bg-default text-emphasis"
                                    : "hover:bg-cal-muted hover:text-default text-subtle",
                                disabled ? "pointer-events-none opacity-30" : "cursor-pointer"
                            )}>
                            <input
                                type="radio"
                                id={inputId}
                                name="segmented-control"
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
