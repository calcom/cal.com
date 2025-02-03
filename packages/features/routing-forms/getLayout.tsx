import React from "react";
import { FormProvider, useForm } from "react-hook-form";

import Shell from "@calcom/features/shell/Shell";

export default function Layout(page: React.ReactNode) {
  const methods = useForm();
  return (
    <FormProvider {...methods}>
      <Shell backPath="/routing/forms" withoutMain={true}>
        {page}
      </Shell>
    </FormProvider>
  );
}
