import { forwardRef, ReactNode, useId } from "react";

import classNames from "@calcom/lib/classNames";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Skeleton } from "@calcom/ui/v2";

import { HintsOrErrors } from "./HintOrErrors";
import { Label } from "./Label";

type InputProps = JSX.IntrinsicElements["input"];

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={classNames(
        "mb-2 block h-9 w-full rounded-md border border-gray-300 py-2 px-3 text-sm placeholder:text-gray-400 hover:border-gray-400 focus:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-800 focus:ring-offset-1",
        props.className
      )}
    />
  );
});

export function InputLeading(props: JSX.IntrinsicElements["div"]) {
  return (
    <span className="inline-flex flex-shrink-0 items-center rounded-l-sm border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
      {props.children}
    </span>
  );
}

type InputFieldProps = {
  label?: ReactNode;
  hint?: ReactNode;
  hintErrors?: string[];
  addOnLeading?: ReactNode;
  addOnSuffix?: ReactNode;
  addOnFilled?: boolean;
  error?: string;
  labelSrOnly?: boolean;
  containerClassName?: string;
  t?: (key: string) => string;
} & React.ComponentProps<typeof Input> & {
    labelProps?: React.ComponentProps<typeof Label>;
    labelClassName?: string;
  };

type AddonProps = {
  children: React.ReactNode;
  isFilled?: boolean;
  className?: string;
  error?: boolean;
};

const Addon = ({ isFilled, children, className, error }: AddonProps) => (
  <div
    className={classNames(
      "addon-wrapper h-9 border border-gray-300 px-3",
      isFilled && "bg-gray-100",
      className
    )}>
    <div className={classNames("flex h-full flex-col justify-center px-1 text-sm", error && "text-red-900")}>
      <span className="whitespace-nowrap py-2.5">{children}</span>
    </div>
  </div>
);

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(props, ref) {
  const id = useId();
  const { t: _t, isLocaleReady, i18n } = useLocale();
  const t = props.t || _t;
  const name = props.name || "";
  const {
    label = t(name),
    labelProps,
    labelClassName,
    placeholder = isLocaleReady && i18n.exists(name + "_placeholder") ? t(name + "_placeholder") : "",
    className,
    addOnLeading,
    addOnSuffix,
    addOnFilled = true,
    hint,
    hintErrors,
    labelSrOnly,
    containerClassName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    t: __t,
    ...passThrough
  } = props;

  return (
    <div className={classNames(containerClassName)}>
      {!!name && (
        <Skeleton
          as={Label}
          htmlFor={id}
          loadingClassName="w-16"
          {...labelProps}
          className={classNames(labelClassName, labelSrOnly && "sr-only", props.error && "text-red-900")}>
          {label}
        </Skeleton>
      )}
      {addOnLeading || addOnSuffix ? (
        <div className="relative mb-1 flex items-center rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-800 focus-within:ring-offset-1">
          {addOnLeading && (
            <Addon isFilled={addOnFilled} className="rounded-l-md border-r-0">
              {addOnLeading}
            </Addon>
          )}
          <Input
            id={id}
            placeholder={placeholder}
            className={classNames(
              className,
              addOnLeading && "rounded-l-none",
              addOnSuffix && "rounded-r-none",
              "!my-0 !ring-0"
            )}
            {...passThrough}
            ref={ref}
          />
          {addOnSuffix && (
            <Addon isFilled={addOnFilled} className="rounded-r-md border-l-0">
              {addOnSuffix}
            </Addon>
          )}
        </div>
      ) : (
        <Input id={id} placeholder={placeholder} className={className} {...passThrough} ref={ref} />
      )}
      <HintsOrErrors hintErrors={hintErrors} fieldName={name} t={t} />
      {hint && <div className="text-gray mt-2 flex items-center text-sm text-gray-700">{hint}</div>}
    </div>
  );
});
