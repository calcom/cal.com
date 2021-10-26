import { useId } from "@radix-ui/react-id";
import { forwardRef, ReactNode } from "react";
import { FormProvider, SubmitHandler, UseFormReturn } from "react-hook-form";

import classNames from "@lib/classNames";
import { getErrorFromUnknown } from "@lib/errors";
import showToast from "@lib/notification";

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

/**
 * Form helper that creates a rect-hook-form Provider and helps with submission handling & default error handling
 */
export function Form<TFieldValues>(
  props: {
    /**
     * Pass in the return from `react-hook-form`s `useForm()`
     */
    form: UseFormReturn<TFieldValues>;
    /**
     * Submit handler - you'll get the typed form values back
     */
    handleSubmit?: SubmitHandler<TFieldValues>;
    /**
     * Optional - Override the default error handling
     * By default it shows a toast with the error
     */
    handleError?: (err: ReturnType<typeof getErrorFromUnknown>) => void;
  } & Omit<JSX.IntrinsicElements["form"], "ref">
) {
  const {
    form,
    handleSubmit,
    handleError = (err) => {
      showToast(err.message, "error");
    },
    ...passThrough
  } = props;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={
          handleSubmit
            ? form.handleSubmit(async (...args) => {
                try {
                  await handleSubmit(...args);
                } catch (_err) {
                  const err = getErrorFromUnknown(_err);
                  handleError(err);
                }
              })
            : undefined
        }
        {...passThrough}>
        {props.children}
      </form>
    </FormProvider>
  );
}

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
