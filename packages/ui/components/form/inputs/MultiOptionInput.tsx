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
  id?: string;
  [key: string]: any;
}

interface MultiOptionInputProps<TFieldValues extends FieldValues> {
  /**
   * The field array name in the form schema
   * @example "fields.0.options" or "questions"
   */
  fieldArrayName: ArrayPath<TFieldValues>;
  addOptionLabel?: string;
  optionPlaceholders?: string[];
  defaultNumberOfOptions?: number;
  /**
   * Delimiters to split pasted text on. Defaults to ["\n", ","]
   */
  pasteDelimiters?: string[];
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
  addOptionLabel = "Add an option",
  optionPlaceholders = ["Option 1", "Option 2", "Option 3", "Option 4"],
  defaultNumberOfOptions = 4,
  pasteDelimiters = ["\n", ","],
  showMoveButtons = true,
  showRemoveButton: _showRemoveButton,
  minOptions = 1,
  disabled = false,
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
      .map(() => ({ label: "", id: uuidv4() }));
    replaceOptions(defaultOptions as PathValue<TFieldValues, Path<TFieldValues>>);
  }

  const showRemoveButton = _showRemoveButton ?? options.length > minOptions;

  const handlePasteInOptionAtIndex = (event: React.ClipboardEvent, optionIndex: number) => {
    const paste = event.clipboardData.getData("text");
    // Split on any of the delimiters
    const delimiterRegex = new RegExp(`[${pasteDelimiters.join("")}]+`);
    const optionsBeingPasted = paste
      .split(delimiterRegex)
      .map((optionLabel) => optionLabel.trim())
      .filter((optionLabel) => optionLabel)
      .map((optionLabel) => ({ label: optionLabel.trim(), id: uuidv4() }));

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
    appendOption({ label: "", id: uuidv4() } as PathValue<TFieldValues, Path<TFieldValues>>);
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
      <ul ref={animationRef}>
        {options.map((option, index) => (
          <li
            key={option.id || `option-${index}`}
            className="group mt-2 flex items-center gap-2"
            onPaste={(event) => handlePasteInOptionAtIndex(event, index)}>
            <div className="flex-grow">
              <TextField
                disabled={disabled}
                containerClassName="[&>*:first-child]:border [&>*:first-child]:border-default hover:[&>*:first-child]:border-gray-400"
                className="border-0 focus:ring-0 focus:ring-offset-0"
                labelSrOnly
                placeholder={optionPlaceholders[index] ?? "New Option"}
                type="text"
                required
                addOnClassname="bg-transparent border-0"
                {...control.register(`${fieldArrayName}.${index}.label` as Path<TFieldValues>)}
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
          color="secondary"
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
