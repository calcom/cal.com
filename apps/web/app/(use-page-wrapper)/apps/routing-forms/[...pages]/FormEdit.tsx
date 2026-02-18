"use client";

import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import { FormBuilder } from "@calcom/web/modules/event-types/components/tabs/advanced/FormBuilder";

import type { inferSSRProps } from "@lib/types/inferSSRProps";

import SingleForm from "@components/apps/routing-forms/SingleForm";

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

// Transform helper: Routing Form -> FormBuilder
const transformToBuilder = (fields: RoutingFormWithResponseCount["fields"]) => {
  return (fields || []).map((f) => {
    // Determine options based on type and type specific props
    // Preserve legacy format: when id is null, keep it as null (don't convert to label)
    let options = f.options?.map((o) => ({
      label: o.label,
      // Keep id as null for legacy options, otherwise use the id
      value: o.id === null ? null : (o.id ?? o.label),
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
      editable: (f.router ? "user-readonly" : "user") as const,
      sources: [],
      hidden: false,
    };
    return field;
  });
};

// Transform helper: FormBuilder -> Routing Form
// Uses fieldIdMap to maintain stable IDs across transformations
const transformToRouting = (
  fields: ReturnType<typeof transformToBuilder>,
  fieldIdMap: Map<string, string>
) => {
  return fields.map((f: any) => {
    // Preserve existing ID or generate a new one only once
    let fieldId = f.id;
    if (!fieldId) {
      // Check if we already generated an ID for this field based on its name
      const mapKey = f.name || f.label;
      if (fieldIdMap.has(mapKey)) {
        fieldId = fieldIdMap.get(mapKey)!;
      } else {
        fieldId = uuidv4();
        fieldIdMap.set(mapKey, fieldId);
      }
    }

    return {
      ...f,
      id: fieldId,
      label: f.label,
      identifier: f.name, // Map name back to identifier
      type: f.type,
      required: f.required,
      placeholder: f.placeholder,
      options: f.options?.map((o: any) => ({
        label: o.label,
        // Preserve legacy format: if value is null, keep id as null
        id: o.value === null ? null : o.value,
      })),
    };
  });
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
  const { t } = useLocale();
  
  // Maintain stable field ID mapping across transformations
  const fieldIdMapRef = useRef(new Map<string, string>());

  // Local form for FormBuilder
  const builderForm = useForm({
    defaultValues: {
      fields: transformToBuilder(hookForm.getValues("fields")),
    },
    mode: "onChange",
  });

  // Sync from parent to local (when parent resets, e.g. on load)
  useEffect(() => {
      const parentFields = hookForm.getValues("fields");
      const localFields = builderForm.getValues("fields");
      
      // Basic check to see if we need to sync from parent (e.g. on initial load or reset)
      if (parentFields?.length && (!localFields || localFields.length === 0)) {
           builderForm.reset({ fields: transformToBuilder(parentFields) });
      } else if (parentFields?.length && localFields?.length && parentFields.length !== localFields.length) {
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
        const transformed = transformToRouting(value.fields as any, fieldIdMapRef.current);
        hookForm.setValue("fields", transformed as any, { shouldDirty: true, shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [builderForm, hookForm]);

  return (
    <div className="p-4 w-full">
      <FormProvider {...builderForm}>
         <FormBuilder
            title={t("questions")}
            description={t("add_questions_to_routing_form")}
            addFieldLabel={t("add_a_booking_question")}
            formProp="fields"
            dataStore={{ options: {} }}
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
