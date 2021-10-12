import { useId } from "@radix-ui/react-id";
import { forwardRef, ReactNode } from "react";
import { FormProvider, UseFormReturn } from "react-hook-form";

import classNames from "@lib/classNames";

export const Input = forwardRef<HTMLInputElement, JSX.IntrinsicElements["input"]>(function Input(props, ref) {
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

export const TextField = forwardRef<
  HTMLInputElement,
  {
    label: ReactNode;
  } & React.ComponentProps<typeof Input> & {
      labelProps?: React.ComponentProps<typeof Label>;
    }
>(function TextField(props, ref) {
  const id = useId();
  const { label, ...passThroughToInput } = props;

  // TODO: use `useForm()` from RHF and get error state here too!
  return (
    <div>
      <Label htmlFor={id} {...props.labelProps}>
        {label}
      </Label>
      <Input id={id} {...passThroughToInput} ref={ref} />
    </div>
  );
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
