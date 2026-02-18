"use client";

import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import { FormBuilder } from "@calcom/web/modules/event-types/components/tabs/advanced/FormBuilder";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm from "@components/apps/routing-forms/SingleForm";

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

// Transform helper: Routing Form -> FormBuilder
const transformToBuilder = (fields: RoutingFormWithResponseCount["fields"]) => {
  return (fields || []).map((f) => {
    // Determine options based on type and type specific props
    let options = f.options?.map((o) => ({
      label: o.label,
      value: o.id ?? o.label,
    }));

    // Preserve router/routerField properties by spreading them
    // Casting to any to allow extra properties not in FormBuilder schema
    const field: any = {
      ...f,
      id: f.id,
      name: f.identifier || f.label, // Use identifier as name if available
      label: f.label,
      type: f.type,
      required: f.required ?? false,
      placeholder: f.placeholder,
      options: options,
      // Ensure compatibility with FormBuilder expected structure
      editable: "user" as const,
      sources: [],
      hidden: false,
    };
    return field;
  });
};

// Transform helper: FormBuilder -> Routing Form
const transformToRouting = (fields: ReturnType<typeof transformToBuilder>) => {
  return fields.map((f: any) => ({
    ...f,
    id: f.id || uuidv4(),
    label: f.label,
    identifier: f.name, // Map name back to identifier
    type: f.type,
    // Fix: Ensure proper type compatibility or casting if needed
    required: f.required,
    placeholder: f.placeholder,
    options: f.options?.map((o: any) => ({
      label: o.label,
      id: o.value,
    })),
  }));
};

const FormEdit = ({
  hookForm,
  form,
  appUrl,
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
  appUrl: string;
}) => {
  // Local form for FormBuilder
  const builderForm = useForm({
    defaultValues: {
      fields: transformToBuilder(hookForm.getValues("fields")),
    },
    mode: "onChange",
  });

  // Sync from parent to local (when parent resets, e.g. on load)
  useEffect(() => {
      // If hookForm values change significantly (e.g. loaded from server or reset), sync to builderForm
      const parentFields = hookForm.getValues("fields");
      const localFields = builderForm.getValues("fields");
      
      // Basic check to see if we need to sync from parent (e.g. on initial load or reset)
      // We rely on checking if local is empty and parent is not, or assuming manual sync is fine.
      // A better way is to listen to a specific event or prop change, but hookForm ref assumes imperative handle.
      
      // Let's just check length for now or if local is empty.
      if (parentFields?.length && (!localFields || localFields.length === 0)) {
           // We might want to be careful not to overwrite user edits if they started editing empty form.
           // However, if parent has fields, we generally want to start with them.
           builderForm.reset({ fields: transformToBuilder(parentFields) });
      } else if (parentFields?.length && localFields?.length && parentFields.length !== localFields.length) {
           // If lengths differ significantly, it might be a reset. But checking ID is safer.
           if (parentFields[0].id !== localFields[0].id) {
               builderForm.reset({ fields: transformToBuilder(parentFields) });
           }
      }
  }, [hookForm, builderForm, form]);

  // Sync from local to parent (on change)
  useEffect(() => {
    const subscription = builderForm.watch((value) => {
      // transform back and update parent
      if (value.fields) {
        const transformed = transformToRouting(value.fields as any);
        hookForm.setValue("fields", transformed as any, { shouldDirty: true, shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [builderForm, hookForm]);

  return (
    <div className="p-4 w-full">
      <FormProvider {...builderForm}>
         <FormBuilder
            title="Questions"
            description="Add questions to your routing form."
            addFieldLabel="Add a question"
            formProp="fields"
            dataStore={{ options: {} }} // FormBuilder expects this
            disabled={false}
            LockedIcon={false}
            shouldConsiderRequired={(field: any) => field.required}
         />
      </FormProvider>
    </div>
  );
};

export default function FormEditPage({
  appUrl,
  permissions,
  ...props
}: inferSSRProps<typeof getServerSideProps> & { appUrl: string }) {
  return (
    <>
      <Toaster position="bottom-right" />
      <SingleForm
        {...props}
        appUrl={appUrl}
        permissions={permissions}
        Page={({ hookForm, form }) => (
          <FormEdit appUrl={appUrl} hookForm={hookForm} form={form} />
        )}
      />
    </>
  );
}
