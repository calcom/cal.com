/**
 * form-edit/[...appPages].tsx  (updated)
 *
 * Replaces the old FormEdit / Field components with the new three-panel
 * FormBuilderPage. The Page render prop interface is unchanged, so SingleForm
 * needs zero modifications.
 *
 * What changed vs. the old file:
 *   - Removed: Field, FormEdit components (sequential list builder)
 *   - Added:   FormBuilderPage (three-panel drag-and-drop builder)
 *   - Preserved: SingleForm wrapper, Toaster, appUrl prop
 *
 * What is unchanged:
 *   - hookForm is still from useFormContext / passed by SingleForm
 *   - useFieldArray still drives all mutations
 *   - The backend mutation payload is identical
 *   - Router-linked fields (routerId) are preserved — FormBuilderPage
 *     never strips unknown keys from existing fields
 */
"use client";

import { Toaster } from "sonner";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm from "../../components/SingleForm";
import { FormBuilderPage } from "@calcom/features/form-builder/components/FormBuilderPage";
import type { getServerSidePropsForSingleFormViewCalId as getServerSideProps } from "../../components/getServerSidePropsSingleFormCalId";

/**
 * form-edit/[...appPages].tsx  (updated)
 *
 * Replaces the old FormEdit / Field components with the new three-panel
 * FormBuilderPage. The Page render prop interface is unchanged, so SingleForm
 * needs zero modifications.
 *
 * What changed vs. the old file:
 *   - Removed: Field, FormEdit components (sequential list builder)
 *   - Added:   FormBuilderPage (three-panel drag-and-drop builder)
 *   - Preserved: SingleForm wrapper, Toaster, appUrl prop
 *
 * What is unchanged:
 *   - hookForm is still from useFormContext / passed by SingleForm
 *   - useFieldArray still drives all mutations
 *   - The backend mutation payload is identical
 *   - Router-linked fields (routerId) are preserved — FormBuilderPage
 *     never strips unknown keys from existing fields
 */

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
        Page={({ hookForm, form, uptoDateForm }) => (
          <FormBuilderPage hookForm={hookForm} form={form} uptoDateForm={uptoDateForm} appUrl={appUrl} />
        )}
      />
    </>
  );
}
