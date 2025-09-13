import { Icon } from "@calcom/ui/components/icon";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "@calid/features/ui/components/button";
import { EmailField } from "@calid/features/ui/components/input/input";
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
    "dark:placeholder:text-muted focus:border-emphasis border-subtle block w-full rounded-md border-default text-sm focus:ring-black disabled:bg-emphasis disabled:hover:cursor-not-allowed dark:selection:bg-green-500 disabled:dark:text-subtle w-full";
  return (
    <>
      {value.length ? (
        <div>
          {/* <label htmlFor="emails" className="text-default my-2 block text-sm font-medium">
            {label}
          </label> */}
          <ul className="flex flex-row w-full">
            {value.map((field, index) => (
              <li className="flex flex-row w-full" key={index}>
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
                />

                <Tooltip content="Remove email">
                  <button className="m-1" type="button">
                    <Icon name="x" width={12} className="text-default" />
                  </button>
                </Tooltip>
              </li>
            ))}
          </ul>
          {!readOnly && (
            <Button
              data-testid="add-another-email"
              type="button"
              color="minimal"
              StartIcon="user-plus"
              className="my-2.5 w-full"
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
          onClick={() => {
            const updatedValue = [...value];
            updatedValue.push("");
            setValue(updatedValue);
          }}
          className="mr-auto">
          <Icon name="triangle-alert" className="h-5 w-5" />
          {label}
        </Button>
      )}
    </>
  );
}

export default MultiEmail;
