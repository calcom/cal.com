import { useId } from "@radix-ui/react-id";
import { forwardRef, ReactElement, ReactNode, Ref } from "react";
import { FieldValues, FormProvider, SubmitHandler, useFormContext, UseFormReturn } from "react-hook-form";

import classNames from "@lib/classNames";
import { getErrorFromUnknown } from "@lib/errors";
import { useLocale } from "@lib/hooks/useLocale";
import showToast from "@lib/notification";

import { Alert } from "@components/ui/Alert";

type InputProps = Omit<JSX.IntrinsicElements["input"], "name"> & { name: string };
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      className={classNames(
        "mt-1 block w-full border border-gray-300 rounded-sm shadow-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-neutral-800 focus:border-neutral-800 sm:text-sm",
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
      {!!props.name && (
        <Label htmlFor={id} {...labelProps}>
          {label}
        </Label>
      )}
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

export const EmailInput = forwardRef<HTMLInputElement, JSX.IntrinsicElements["input"]>(function EmailInput(
  props,
  ref
) {
  return (
    <input
      type="email"
      autoCapitalize="none"
      autoComplete="email"
      autoCorrect="off"
      inputMode="email"
      ref={ref}
      {...props}
    />
  );
});

export const EmailField = forwardRef<HTMLInputElement, InputFieldProps>(function EmailField(props, ref) {
  return <EmailInput ref={ref} {...props} />;
});

type FormProps<T> = { form: UseFormReturn<T>; handleSubmit: SubmitHandler<T> } & Omit<
  JSX.IntrinsicElements["form"],
  "onSubmit"
>;

const PlainForm = <T extends FieldValues>(props: FormProps<T>, ref: Ref<HTMLFormElement>) => {
  const { form, handleSubmit, ...passThrough } = props;

  return (
    <FormProvider {...form}>
      <form
        ref={ref}
        onSubmit={(event) => {
          form
            .handleSubmit(handleSubmit)(event)
            .catch((err) => {
              showToast(`${getErrorFromUnknown(err).message}`, "error");
            });
        }}
        {...passThrough}>
        {props.children}
      </form>
    </FormProvider>
  );
};

export const Form = forwardRef(PlainForm) as <T extends FieldValues>(
  p: FormProps<T> & { ref?: Ref<HTMLFormElement> }
) => ReactElement;

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
