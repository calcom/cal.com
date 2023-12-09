import type { FieldValues } from "react-hook-form";
import { useFormContext } from "react-hook-form";

import { classNames } from "@calcom/lib";

import { Check, Circle, X } from "../../icon";

type hintsOrErrorsProps = {
  hintErrors?: string[];
  fieldName: string;
  t: (key: string) => string;
};

function CustomErrors({ fieldName, t }: hintsOrErrorsProps) {
  const methods = useFormContext();
  const fieldErrors = methods.formState.errors[fieldName];

  if (!fieldErrors) return null;

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

export function HintsOrErrors<T extends FieldValues = FieldValues>({
  hintErrors,
  fieldName,
  t,
}: hintsOrErrorsProps) {
  const methods = useFormContext() as ReturnType<typeof useFormContext> | null;
  /* If there's no methods it means we're using these components outside a React Hook Form context */

  if (!methods && hintErrors && hintErrors?.length > 0) {
    throw new Error("InputField is expecting hint errors but is not use within a RHF context");
  }

  if (!methods) return null;

  const { formState } = methods;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const fieldErrors: FieldErrors<T> | undefined = formState.errors[fieldName];

  if (!hintErrors && fieldErrors && !fieldErrors.message) {
    // no hints passed, field errors exist and they are custom ones
    return <CustomErrors hintErrors={hintErrors} fieldName={fieldName} t={t} />;
  }

  // No hint errors passed and there are no additional errors
  if (!hintErrors) return null;

  function IconRenderer({
    submitted,
    error,
    isDirty,
  }: {
    submitted: boolean;
    error: string | undefined;
    isDirty: boolean;
  }) {
    console.log({ submitted, error, isDirty });
    if (!isDirty && !error) {
      return <Circle fill="currentColor" size="5" className="inline-block ltr:mr-2 rtl:ml-2" />;
    }

    if (isDirty && error) {
      return <X size="12" strokeWidth="3" className="-ml-1 inline-block ltr:mr-2 rtl:ml-2" />;
      // return <Check size="12" strokeWidth="3" className="-ml-1 inline-block ltr:mr-2 rtl:ml-2" />;
    }

    return <Check size="12" strokeWidth="3" className="-ml-1 inline-block ltr:mr-2 rtl:ml-2" />;
  }

  // hints passed, field errors exist
  return (
    <div className={classNames("text-gray text-default mt-2 flex items-center text-sm")}>
      <ul className="ml-2">
        {hintErrors.map((key: string) => {
          const submitted = formState.isSubmitted;
          const error: string | undefined =
            fieldErrors && fieldErrors[key] ? fieldErrors[key] : fieldErrors?.message;
          const isDirty = !!formState.dirtyFields[fieldName];

          return (
            <li key={key} data-testid="hint-error" className={error ? "text-red-700" : "text-muted"}>
              <IconRenderer submitted={submitted} error={error} isDirty={isDirty} />
              {t(`${fieldName}_hint_${key}`)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
