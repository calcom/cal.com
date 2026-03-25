"use client";

import { Toaster } from "sonner";

import { FormBuilderPage } from "@calcom/features/form-builder/components/FormBuilderPage";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm from "../../components/SingleForm";
import type { getServerSidePropsForSingleFormViewCalId as getServerSideProps } from "../../components/getServerSidePropsSingleFormCalId";

export default function FormEditPage({
  appUrl,
  ...props
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <>
      <Toaster position="bottom-center" />
      <SingleForm
        {...props}
        appUrl={appUrl}
        Page={({ hookForm, form, uptoDateForm }) => {
          const watchedId = hookForm.watch("id");
          const watchedFields = hookForm.watch("fields");
          const isHookFormInitialized = watchedId === form.id && watchedFields !== undefined;

          return (
            <FormBuilderPage
              hookForm={hookForm}
              form={form}
              uptoDateForm={uptoDateForm}
              appUrl={appUrl}
              showCanvasSkeleton={!isHookFormInitialized}
            />
          );
        }}
      />
    </>
  );
}
