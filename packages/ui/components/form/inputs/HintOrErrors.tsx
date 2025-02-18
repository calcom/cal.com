import type { FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import { Icon } from "../../icon";
import { InputError } from "./InputError";

type hintsOrErrorsProps = {
  hintErrors?: string[];
  fieldName: string;
  t: (key: string) => string;
};

export function HintsOrErrors<T extends FieldValues = FieldValues>({
  hintErrors,
  fieldName,
  t,
}: hintsOrErrorsProps) {
  const methods = useFormContext() as ReturnType<typeof useFormContext> | null;
  /* If there's no methods it means we're using these components outside a React Hook Form context */
  if (!methods) return null;
  const { formState } = methods;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const fieldErrors: FieldErrors<T> | undefined = formState.errors[fieldName];

  if (!hintErrors && fieldErrors && !fieldErrors.message) {
    // no hints passed, field errors exist and they are custom ones
    return (
      <div className="text-gray text-default mt-2 flex items-center text-sm">
        <ul className="ml-2">
          {Object.keys(fieldErrors).map((key: string) => {
            return (
              <li key={key} className="text-blue-700">
                {t(`${fieldName}_hint_${key}`)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (hintErrors && fieldErrors) {
    // hints passed, field errors exist
    return (
      <div className="text-gray text-default mt-2 flex items-center text-sm">
        <ul className="ml-2">
          {hintErrors.map((key: string) => {
            const submitted = formState.isSubmitted;
            const error = fieldErrors[key] || fieldErrors.message;
            return (
              <li
                key={key}
                data-testid="hint-error"
                className={error !== undefined ? (submitted ? "text-error" : "") : "text-green-600"}>
                {error !== undefined ? (
                  submitted ? (
                    <Icon
                      name="x"
                      size="12"
                      strokeWidth="3"
                      className="-ml-1 inline-block ltr:mr-2 rtl:ml-2"
                    />
                  ) : (
                    <Icon
                      name="circle"
                      fill="currentColor"
                      size="5"
                      className="inline-block ltr:mr-2 rtl:ml-2"
                    />
                  )
                ) : (
                  <Icon
                    name="check"
                    size="12"
                    strokeWidth="3"
                    className="-ml-1 inline-block ltr:mr-2 rtl:ml-2"
                  />
                )}
                {t(`${fieldName}_hint_${key}`)}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // errors exist, not custom ones, just show them as is
  if (fieldErrors) {
    return <InputError message={fieldErrors.message} />;
  }

  if (!hintErrors) return null;

  // hints passed, no errors exist, proceed to just show hints
  return (
    <div className="text-gray text-default mt-2 flex items-center text-sm">
      <ul className="ml-2">
        {hintErrors.map((key: string) => {
          // if field was changed, as no error exist, show checked status and color
          const dirty = formState.dirtyFields[fieldName];
          return (
            <li key={key} className={!!dirty ? "text-green-600" : ""}>
              {!!dirty ? (
                <Icon
                  name="check"
                  size="12"
                  strokeWidth="3"
                  className="-ml-1 inline-block ltr:mr-2 rtl:ml-2"
                />
              ) : (
                <Icon name="circle" fill="currentColor" size="5" className="inline-block ltr:mr-2 rtl:ml-2" />
              )}
              {t(`${fieldName}_hint_${key}`)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
