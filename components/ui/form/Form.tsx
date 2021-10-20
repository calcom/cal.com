import { PropsWithChildren } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";

type FormProps<TFormValues> = PropsWithChildren<{
  onSubmit: SubmitHandler<TFormValues>;
  className?: string;
}>;

const Form = <TFormValues extends Record<string, unknown> = Record<string, unknown>>({
  onSubmit,
  className = "",
  children,
}: FormProps<TFormValues>) => {
  const methods = useForm<TFormValues>();
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  );
};

export default Form;
