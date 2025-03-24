import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import { EmailField } from "../form";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";

interface MultiEmailProps {
  value: string[];
  readOnly: boolean;
  label: string;
  setValue: (value: string[]) => void;
  placeholder?: string;
}

function MultiEmail({ value, readOnly, label, setValue, placeholder }: MultiEmailProps) {
  const { t } = useLocale();
  value = value || [];
  const inputClassName =
    "dark:placeholder:text-muted focus:border-emphasis border-subtle block w-full rounded-md border-default text-sm focus:ring-black disabled:bg-emphasis disabled:hover:cursor-not-allowed dark:selection:bg-green-500 disabled:dark:text-subtle";
  return (
    <>
      {value.length ? (
        <div>
          <label htmlFor="emails" className="text-default my-2 block text-sm font-medium">
            {label}
          </label>
          <ul>
            {value.map((field, index) => (
              <li key={index}>
                <EmailField
                  disabled={readOnly}
                  value={field}
                  className={inputClassName}
                  onChange={(e) => {
                    const updatedValue = [...value];
                    updatedValue[index] = e.target.value;
                    setValue(updatedValue);
                  }}
                  placeholder={placeholder}
                  label={<></>}
                  required
                  onClickAddon={() => {
                    const updatedValue = [...value];
                    updatedValue.splice(index, 1);
                    setValue(updatedValue);
                  }}
                  addOnSuffix={
                    !readOnly ? (
                      <Tooltip content="Remove email">
                        <button className="m-1" type="button">
                          <Icon name="x" width={12} className="text-default" />
                        </button>
                      </Tooltip>
                    ) : null
                  }
                />
              </li>
            ))}
          </ul>
          {!readOnly && (
            <Button
              data-testid="add-another-email"
              type="button"
              color="minimal"
              StartIcon="user-plus"
              className="my-2.5"
              onClick={() => {
                const updatedValue = [...value];
                updatedValue.push("");
                setValue(updatedValue);
              }}>
              {t("add_another")}
            </Button>
          )}
        </div>
      ) : (
        <></>
      )}

      {!value.length && !readOnly && (
        <Button
          data-testid="add-emails"
          color="minimal"
          variant="button"
          StartIcon="user-plus"
          onClick={() => {
            const updatedValue = [...value];
            updatedValue.push("");
            setValue(updatedValue);
          }}
          className="mr-auto">
          {label}
        </Button>
      )}
    </>
  );
}

export default MultiEmail;
