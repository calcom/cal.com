import { cn } from "@calid/features/lib/cn";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import * as React from "react";

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "bg-white p-1 ",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "focus:bg-accent bg-blue focus:text-accent-foreground relative flex w-full cursor-default select-none items-center rounded-sm p-2 py-1.5 pl-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className=" ml-2">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator ref={ref} className={cn("bg-muted -mx-1 my-1 h-px", className)} {...props} />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// MultiSelect Component
interface MultiSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  isLoading?: boolean;
  selected: Option[];
  setSelected: (selected: Option[]) => void;
  className?: string;
  isDisabled?: boolean;
  countText?: string;
  placeholder?: string;
  onOpenChange?: (open: boolean) => void;
  maxHeight?: string;
  showClearButton?: boolean;
  selectAllOption?: boolean;
  searchable?: boolean;
}

const MultiSelect = React.forwardRef<HTMLButtonElement, MultiSelectProps>(
  (
    {
      options,
      isLoading = false,
      selected = [],
      setSelected,
      className,
      isDisabled = false,
      countText = "items selected",
      placeholder = "Select items...",
      onOpenChange,
      maxHeight = "max-h-96",
      showClearButton = true,
      selectAllOption = false,
      searchable = false,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
      if (!open) {
        setSearchTerm("");
      }
    };

    // Click outside detection
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          handleOpenChange(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    const handleToggleItem = (option: Option) => {
      const exists = selected.some((o) => o.value === option.value);
      if (exists) {
        setSelected(selected.filter((o) => o.value !== option.value));
      } else {
        setSelected([...selected, option]);
      }
    };

    const handleSelectAll = () => {
      if (selected.length === options.length) {
        setSelected([]);
      } else {
        setSelected([...options]);
      }
    };

    const handleClearAll = () => {
      setSelected([]);
    };

    const filteredOptions = searchable
      ? options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
      : options;

    const getDisplayText = () => {
      if (selected.length === 0) return placeholder;
      if (selected.length === 1) {
        const selectedOption = options.find((opt) => opt === selected[0]);
        return selectedOption?.label || selected[0].label;
      }
      return `${selected.length} ${countText}`;
    };

    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <button
          ref={ref}
          type="button"
          onClick={() => handleOpenChange(!isOpen)}
          disabled={isDisabled || isLoading}
          className={cn(
            "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus:ring-ring flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}>
          <span className="truncate text-left">{isLoading ? "Loading..." : getDisplayText()}</span>
          <div className="flex items-center gap-2">
            {showClearButton && selected.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} />
          </div>
        </button>

        {isOpen && (
          <div
            className={cn(
              "bg-popover text-popover-foreground absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md",
              maxHeight
            )}>
            <div className="max-h-96 overflow-y-auto bg-white p-1">
              {searchable && (
                <div className="border-b p-2">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {selectAllOption && (
                <>
                  <div
                    className="flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={handleSelectAll}>
                    <input
                      type="checkbox"
                      checked={selected.length === options.length}
                      onChange={handleSelectAll}
                      className="mr-2"
                    />
                    <span className="font-medium">
                      {selected.length === options.length ? "Deselect All" : "Select All"}
                    </span>
                  </div>
                  <div className="mx-2 mb-1 border-b" />
                </>
              )}

              {filteredOptions.length === 0 ? (
                <div className="text-muted-foreground px-3 py-2 text-sm">
                  {searchable && searchTerm ? "No results found" : "No options available"}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-gray-100",
                      option.disabled && "cursor-not-allowed opacity-50"
                    )}
                    onClick={() => !option.disabled && handleToggleItem(option)}>
                    <input
                      type="checkbox"
                      checked={selected.some((o) => o.value === option.value)}
                      onChange={() => handleToggleItem(option)}
                      disabled={option.disabled}
                      className="mr-2"
                    />
                    <span>{option.label}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

MultiSelect.displayName = "MultiSelect";

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  MultiSelect,
};
