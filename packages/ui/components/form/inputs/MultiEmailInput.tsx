import { useAutoAnimate } from "@formkit/auto-animate/react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { EmailField } from "./Input";

export type MultiEmailInputProps = {
  /** The name of the input field, used for IDs. */
  name?: string;
  /** The current array of email strings. */
  value: string[] | undefined;
  /** Callback function to update the email array. */
  onChange: (value: string[]) => void;
  /** The main label for the entire component. */
  label: string;
  /** Placeholder text for each email input field. */
  placeholder?: string;
  /** Whether the fields are editable. */
  disabled?: boolean;
};

export function MultiEmailInput({
  value: valueProp,
  onChange,
  label,
  placeholder,
  disabled,
  name,
}: MultiEmailInputProps) {
  const { t } = useLocale();
  const [parent] = useAutoAnimate<HTMLUListElement>();
  const value = valueProp || [];
  const baseId = (name ?? "multi-email").replace(/[^a-zA-Z0-9_-]/g, "-");

  const handleEmailChange = (index: number, email: string) => {
    const newValue = [...value];
    newValue[index] = email.toLowerCase();
    onChange(newValue);
  };

  const handleRemoveEmail = (index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  const handleAddEmail = () => {
    const newValue = [...value, ""];
    onChange(newValue);
  };

  if (!value.length && disabled) {
    return null; // Don't render anything if there are no emails and it's disabled.
  }

  if (!value.length && !disabled) {
    return (
      <Button
        data-testid="add-guests"
        color="minimal"
        variant="button"
        StartIcon="user-plus"
        onClick={handleAddEmail}
        className="mr-auto h-fit whitespace-normal text-left">
        <span className="flex-1">{label}</span>
      </Button>
    );
  }

  return (
    <div>
      <label
        htmlFor={value.length ? `${baseId}.0` : baseId}
        className="text-default mb-1 block text-sm font-medium">
        {label}
      </label>
      <ul ref={parent}>
        {value.map((email, index) => (
          <li key={index} className="mb-2">
            <EmailField
              id={`${baseId}.${index}`}
              disabled={disabled}
              value={email}
              onChange={(e) => handleEmailChange(index, e.target.value)}
              placeholder={placeholder}
              label={<></>}
              required
              onClickAddon={() => handleRemoveEmail(index)}
              addOnSuffix={
                !disabled ? (
                  <Tooltip content={t("remove_email")}>
                    <button className="m-1" type="button" aria-label={t("remove_email")}>
                      <Icon name="x" width={12} className="text-default" />
                    </button>
                  </Tooltip>
                ) : null
              }
            />
          </li>
        ))}
      </ul>
      {!disabled && (
        <Button
          data-testid="add-another-guest"
          type="button"
          color="minimal"
          StartIcon="user-plus"
          className="my-2.5"
          onClick={handleAddEmail}>
          {t("add_another")}
        </Button>
      )}
    </div>
  );
}
