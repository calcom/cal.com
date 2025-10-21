import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  useFieldArray,
  useFormContext,
  type FieldValues,
  type Path,
  type PathValue,
  type ArrayPath,
} from "react-hook-form";
import { v4 as uuidv4 } from "uuid";

import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

export interface Option {
  label: string;
  value?: string;
  id?: string;
  [key: string]: any;
}

interface MultiOptionInputProps<TFieldValues extends FieldValues> {
  /**
   * The field array name in the form schema
   * @example "fields.0.options" or "questions"
   */
  fieldArrayName: ArrayPath<TFieldValues>;
  /**
   * Whether to display as key-value pairs
   * @default false
   */
  keyValueMode?: boolean;
  /**
   * Label for the key field in key-value mode
   * @default "Key"
   */
  keyLabel?: string;
  /**
   * Label for the value field in key-value mode
   * @default "Value"
   */
  valueLabel?: string;
  /**
   * Custom regex pattern to validate keys
   */
  keyPattern?: string;
  addOptionLabel?: string;
  addOptionButtonColor?: "primary" | "secondary" | "minimal";
  optionPlaceholders?: string[];
  /**
   * Placeholders for value fields in key-value mode
   */
  valuePlaceholders?: string[];
  defaultNumberOfOptions?: number;
  /**
   * Delimiters to split pasted text on. Defaults to ["\n", ","]
   * For key-value pairs, will try to split on ":" or "=" between key and value
   */
  pasteDelimiters?: string[];
  /**
   * Delimiters to split key-value pairs on. Defaults to [":", "="]
   */
  keyValueDelimiters?: string[];
  /**
   * Whether to show move up/down buttons. Defaults to true
   */
  showMoveButtons?: boolean;
  /**
   * Whether to show remove button. Defaults to true when there is more than 1 option
   */
  showRemoveButton?: boolean;
  /**
   * Minimum number of options required. Defaults to 1
   */
  minOptions?: number;
  disabled?: boolean;
}

export const MultiOptionInput = <TFieldValues extends FieldValues>({
  fieldArrayName,
  keyValueMode = false,
  keyLabel = "Key",
  valueLabel = "Value",
  keyPattern,
  addOptionLabel = "Add an option",
  optionPlaceholders = ["Option 1", "Option 2", "Option 3", "Option 4"],
  valuePlaceholders = ["Value 1", "Value 2", "Value 3", "Value 4"],
  defaultNumberOfOptions = 4,
  pasteDelimiters = ["\n", ","],
  keyValueDelimiters = [":", "="],
  showMoveButtons = true,
  showRemoveButton: _showRemoveButton,
  minOptions = 1,
  disabled = false,
  addOptionButtonColor = "primary",
}: MultiOptionInputProps<TFieldValues>) => {
  const [animationRef] = useAutoAnimate<HTMLUListElement>();
  const { control } = useFormContext<TFieldValues>();

  const {
    fields: options,
    append: appendOption,
    remove: removeOption,
    move: moveOption,
    replace: replaceOptions,
  } = useFieldArray({
    control,
    name: fieldArrayName,
  });

  // Initialize with default options if none exist
  if (options.length === 0) {
    const defaultOptions = Array(defaultNumberOfOptions)
      .fill(0)
      .map(() => ({ label: "", value: "", id: uuidv4() }));
    replaceOptions(defaultOptions as PathValue<TFieldValues, Path<TFieldValues>>);
  }

  const showRemoveButton = _showRemoveButton ?? options.length > minOptions;

  const handlePasteInOptionAtIndex = (event: React.ClipboardEvent, optionIndex: number) => {
    const paste = event.clipboardData.getData("text");
    // Split on any of the delimiters
    const delimiterRegex = new RegExp(`[${pasteDelimiters.join("")}]+`);
    const keyValueRegex = new RegExp(
      `([^${keyValueDelimiters.join("")}]+)([${keyValueDelimiters.join("")}])(.+)`
    );

    const optionsBeingPasted = paste
      .split(delimiterRegex)
      .map((optionText) => optionText.trim())
      .filter((optionText) => optionText)
      .map((optionText) => {
        // If in key-value mode, try to parse as key-value
        if (keyValueMode) {
          const match = optionText.match(keyValueRegex);
          if (match) {
            return {
              label: match[1].trim(),
              value: match[3].trim(),
              id: uuidv4(),
            };
          }
          return { label: optionText, value: "", id: uuidv4() };
        }
        return { label: optionText, id: uuidv4() };
      });

    if (optionsBeingPasted.length === 1) {
      // If there is only one option, let the default paste behavior handle it
      return;
    }

    // Don't allow pasting that value, as we would update the options through state update
    event.preventDefault();

    // Replace the current option with the first pasted option
    const updatedOptions = [...options] as PathValue<TFieldValues, Path<TFieldValues>>[];
    updatedOptions[optionIndex] = optionsBeingPasted[0] as PathValue<TFieldValues, Path<TFieldValues>>;

    // Insert the rest of the options after the current option
    updatedOptions.splice(
      optionIndex + 1,
      0,
      ...(optionsBeingPasted.slice(1) as PathValue<TFieldValues, Path<TFieldValues>>[])
    );
    replaceOptions(updatedOptions as PathValue<TFieldValues, Path<TFieldValues>>);
  };

  const addOption = () => {
    appendOption({ label: "", value: "", id: uuidv4() } as PathValue<TFieldValues, Path<TFieldValues>>);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= minOptions) return;
    removeOption(index);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    moveOption(index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index === options.length - 1) return;
    moveOption(index, index + 1);
  };

  return (
    <div className="w-full">
      {keyValueMode && (
        <div className="mb-2 flex items-center px-2">
          <div className="grow">
            <span className="text-subtle text-xs font-medium">{keyLabel}</span>
          </div>
          <div className="grow">
            <span className="text-subtle text-xs font-medium">{valueLabel}</span>
          </div>
          {/* Space for buttons */}
          <div className="w-12" />
        </div>
      )}
      <ul ref={animationRef}>
        {options.map((option, index) => (
          <li
            key={option.id || `option-${index}`}
            className="group mt-2 flex items-center gap-2"
            onPaste={(event) => handlePasteInOptionAtIndex(event, index)}>
            {keyValueMode ? (
              // Key-value pair mode
              <div className="flex w-full gap-2">
                <div className="grow">
                  <TextField
                    disabled={disabled}
                    labelSrOnly
                    placeholder={optionPlaceholders[index] ?? "Key"}
                    pattern={keyPattern}
                    type="text"
                    required
                    addOnClassname="bg-transparent border-0"
                    {...control.register(`${fieldArrayName}.${index}.label` as Path<TFieldValues>)}
                  />
                </div>
                <div className="grow">
                  <TextField
                    disabled={disabled}
                    labelSrOnly
                    placeholder={valuePlaceholders[index] ?? "Value"}
                    type="text"
                    required
                    addOnClassname="bg-transparent border-0"
                    {...control.register(`${fieldArrayName}.${index}.value` as Path<TFieldValues>)}
                    addOnSuffix={
                      showRemoveButton ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          aria-label="Remove option"
                          disabled={disabled}>
                          <Icon name="x" className="h-4 w-4" />
                        </button>
                      ) : null
                    }
                  />
                </div>
              </div>
            ) : (
              // Standard mode
              <div className="grow">
                <TextField
                  disabled={disabled}
                  labelSrOnly
                  placeholder={optionPlaceholders[index] ?? "New Option"}
                  type="text"
                  required
                  addOnClassname="bg-transparent border-0"
                  {...control.register(`${fieldArrayName}.${index}.label` as Path<TFieldValues>)}
                  data-testid={`${fieldArrayName}.${index}-input`}
                  addOnSuffix={
                    showRemoveButton ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        aria-label="Remove option"
                        disabled={disabled}>
                        <Icon name="x" className="h-4 w-4" />
                      </button>
                    ) : null
                  }
                />
              </div>
            )}
            {showMoveButtons && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0 || disabled}
                  className={classNames(
                    "bg-default text-muted hover:text-emphasis invisible flex h-6 w-6 items-center justify-center rounded-t-md border p-1 transition-all hover:border-transparent hover:shadow group-hover:visible",
                    index === 0 ? "cursor-not-allowed opacity-30" : "cursor-pointer"
                  )}>
                  <Icon name="arrow-up" className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === options.length - 1 || disabled}
                  className={classNames(
                    "bg-default text-muted hover:text-emphasis invisible -mt-px flex h-6 w-6 items-center justify-center rounded-b-md border p-1 transition-all hover:border-transparent hover:shadow group-hover:visible",
                    index === options.length - 1 ? "cursor-not-allowed opacity-30" : "cursor-pointer"
                  )}>
                  <Icon name="arrow-down" className="h-3 w-3" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className={classNames("flex")}>
        <Button
          type="button"
          color={addOptionButtonColor}
          StartIcon="plus"
          onClick={addOption}
          className="mt-4 border-none"
          disabled={disabled}>
          {addOptionLabel}
        </Button>
      </div>
    </div>
  );
};
