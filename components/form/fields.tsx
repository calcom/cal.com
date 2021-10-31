import { useId } from "@radix-ui/react-id";
import { forwardRef, ReactNode } from "react";
import { FormProvider, useFormContext, UseFormReturn } from "react-hook-form";

import classNames from "@lib/classNames";
import { useLocale } from "@lib/hooks/useLocale";

import { Alert } from "@components/ui/Alert";

type InputProps = Omit<JSX.IntrinsicElements["input"], "name"> & { name: string };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={classNames(
        "mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-neutral-500 focus:border-neutral-500 sm:text-sm",
        props.className
      )}
    />
  );
});

export function Label(props: JSX.IntrinsicElements["label"]) {
  return (
    <label {...props} className={classNames("block text-sm font-medium text-gray-700", props.className)}>
      {props.children}
    </label>
  );
}

type InputFieldProps = {
  label?: ReactNode;
  addOnLeading?: ReactNode;
} & React.ComponentProps<typeof Input> & {
    labelProps?: React.ComponentProps<typeof Label>;
  };

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(props, ref) {
  const id = useId();
  const { t } = useLocale();
  const methods = useFormContext();
  const {
    label = t(props.name),
    labelProps,
    placeholder = t(props.name + "_placeholder") !== props.name + "_placeholder"
      ? t(props.name + "_placeholder")
      : "",
    className,
    addOnLeading,
    ...passThroughToInput
  } = props;
  return (
    <div>
      <Label htmlFor={id} {...labelProps}>
        {label}
      </Label>
      {addOnLeading ? (
        <div className="flex mt-1 rounded-md shadow-sm">
          {addOnLeading}
          <Input
            id={id}
            placeholder={placeholder}
            className={classNames(className, "mt-0")}
            {...passThroughToInput}
            ref={ref}
          />
        </div>
      ) : (
        <Input id={id} placeholder={placeholder} className={className} {...passThroughToInput} ref={ref} />
      )}
      {methods?.formState?.errors[props.name] && (
        <Alert className="mt-1" severity="error" message={methods.formState.errors[props.name].message} />
      )}
    </div>
  );
});

export const TextField = forwardRef<HTMLInputElement, InputFieldProps>(function TextField(props, ref) {
  return <InputField ref={ref} {...props} />;
});

export const PasswordField = forwardRef<HTMLInputElement, InputFieldProps>(function PasswordField(
  props,
  ref
) {
  return <InputField type="password" placeholder="•••••••••••••" ref={ref} {...props} />;
});

export const EmailField = forwardRef<HTMLInputElement, InputFieldProps>(function EmailField(props, ref) {
  return <InputField type="email" inputMode="email" ref={ref} {...props} />;
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Form = forwardRef<HTMLFormElement, { form: UseFormReturn<any> } & JSX.IntrinsicElements["form"]>(
  function Form(props, ref) {
    const { form, ...passThrough } = props;

    return (
      <FormProvider {...form}>
        <form ref={ref} {...passThrough}>
          {props.children}
        </form>
      </FormProvider>
    );
  }
);

export function FieldsetLegend(props: JSX.IntrinsicElements["legend"]) {
  return (
    <legend {...props} className={classNames("text-sm font-medium text-gray-700", props.className)}>
      {props.children}
    </legend>
  );
}

export function InputGroupBox(props: JSX.IntrinsicElements["div"]) {
  return (
    <div
      {...props}
      className={classNames("p-2 bg-white border border-gray-300 rounded-sm space-y-2", props.className)}>
      {props.children}
    </div>
  );
}
