"use client";

import { FormProvider as ReactHookFormProvider, useForm } from "react-hook-form";

export default function FormProvider({ children }: { children: React.ReactNode }) {
  const methods = useForm();

  return <ReactHookFormProvider {...methods}>{children}</ReactHookFormProvider>;
}
