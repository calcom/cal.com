import type { TextLikeComponentProps } from "@calcom/app-store/routing-forms/components/react-awesome-query-builder/widgets";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Button } from "../button";
import { EmailField } from "../form";
import { Icon } from "../icon";
import { Tooltip } from "../tooltip";

export function MultiEmail({ value, readOnly, label, setValue, ...props }: TextLikeComponentProps<string[]>) {
  const placeholder = props.placeholder;
  const { t } = useLocale();
  value = value || [];

  return (
    <>
      {value.length ? (
        <div>
          <label htmlFor="guests" className="text-default  mb-1 block text-sm font-medium">
            {label}
          </label>
          <ul>
            {value.map((field, index) => (
              <li key={index}>
                <EmailField
                  id={`${props.name}.${index}`}
                  disabled={readOnly}
                  value={value[index]}
                  onChange={(e) => {
                    value[index] = e.target.value.toLowerCase();
                    setValue(value);
                  }}
                  placeholder={placeholder}
                  label={<></>}
                  required
                  onClickAddon={() => {
                    value.splice(index, 1);
                    setValue(value);
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
              data-testid="add-another-guest"
              type="button"
              color="minimal"
              StartIcon="user-plus"
              className="my-2.5"
              onClick={() => {
                value.push("");
                setValue(value);
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
          data-testid="add-guests"
          color="minimal"
          variant="button"
          StartIcon="user-plus"
          onClick={() => {
            value.push("");
            setValue(value);
          }}
          className="mr-auto h-fit whitespace-normal text-left">
          <span className="flex-1">{label}</span>
        </Button>
      )}
    </>
  );
}
