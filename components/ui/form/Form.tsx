import { useForm, FormProvider, SubmitHandler, UseFormProps, UseFormReturn } from "react-hook-form";

type FormProps<TFormValues> = {
  onSubmit: SubmitHandler<TFormValues>;
  defaultValues?: UseFormProps<TFormValues>["defaultValues"];
  children: (methods: UseFormReturn<TFormValues>) => React.ReactNode;
  className?: string;
};

// XXX: INTENDED FOR RFC - forwardRef does not play well with TFormValues & visa versa
const Form = <TFormValues extends Record<string, unknown> = Record<string, unknown>>({
  onSubmit,
  className = "",
  defaultValues,
  children,
}: FormProps<TFormValues>) => {
  const methods = useForm<TFormValues>({ defaultValues });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className={className}>
        {children}
      </form>
    </FormProvider>
  );
};

export default Form;
