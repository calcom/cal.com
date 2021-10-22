import { PropsWithChildren } from "react";
import { useForm, FormProvider, SubmitHandler, UseFormProps } from "react-hook-form";

type FormProps<TFormValues> = PropsWithChildren<{
  onSubmit: SubmitHandler<TFormValues>;
  defaultValues?: UseFormProps<TFormValues>["defaultValues"];
}> &
  Omit<JSX.IntrinsicElements["form"], "onSubmit">;

// XXX: RFC INTENDED - could replace the one in fields.tsx
const Form = <TFormValues extends Record<string, unknown> = Record<string, unknown>>(
  props: FormProps<TFormValues>
) => {
  const { onSubmit, defaultValues, children, ...passThrough } = props;
  const methods = useForm<TFormValues>({ defaultValues });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} {...passThrough}>
        {children}
      </form>
    </FormProvider>
  );
};

export default Form;
