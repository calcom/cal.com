"use client";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { LearnMoreLink } from "@calcom/features/eventtypes/components/LearnMoreLink";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import { FormBuilder } from "@calcom/web/modules/event-types/components/tabs/advanced/FormBuilder";
import SingleForm from "@components/apps/routing-forms/SingleForm";
import type { inferSSRProps } from "@lib/types/inferSSRProps";
import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormProvider, useForm } from "react-hook-form";
import { Toaster } from "sonner";

import {
  type FormBuilderField,
  type RoutingFormField,
  transformToBuilder,
  transformToRouting,
} from "./formBuilderAdapters";

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

const FormEdit = ({
  hookForm,
  form,
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
}) => {
  const { t } = useLocale();

  const fieldIdMapRef = useRef(new Map<string, string>());
  const originalTypeRegistryRef = useRef(new Map<string, string>());
  const previousFieldsRef = useRef<RoutingFormField[] | null>(null);
  const hasResponses = form._count.responses > 0;

  const builderForm = useForm<{ fields: FormBuilderField[] }>({
    defaultValues: {
      fields: transformToBuilder(hookForm.getValues("fields"), hasResponses),
    },
    mode: "onChange",
  });

  useEffect(() => {
    const parentFields = hookForm.getValues("fields");

    if (!parentFields || parentFields.length === 0) {
      builderForm.reset({ fields: [] });
      fieldIdMapRef.current.clear();
      originalTypeRegistryRef.current.clear();
      previousFieldsRef.current = null;
      return;
    }

    if (!fieldIdMapRef.current.size) {
      parentFields.forEach((field) => {
        const identifier = field.identifier || getFieldIdentifier(field.label);
        fieldIdMapRef.current.set(identifier, field.id);
        if (hasResponses) {
          originalTypeRegistryRef.current.set(identifier, field.type);
        }
      });
    }

    const localFields = builderForm.getValues("fields");

    if (!localFields || localFields.length === 0) {
      builderForm.reset({ fields: transformToBuilder(parentFields, hasResponses) });
      previousFieldsRef.current = parentFields;
    } else if (parentFields.length !== localFields.length) {
      if (parentFields[0]?.id !== localFields[0]?.id) {
        builderForm.reset({ fields: transformToBuilder(parentFields, hasResponses) });
        previousFieldsRef.current = parentFields;
      }
    }
  }, [hookForm, builderForm, hasResponses]);

  useEffect(() => {
    const subscription = builderForm.watch((value) => {
      if (value.fields) {
        let fieldsToTransform: any = value.fields;

        if (hasResponses && originalTypeRegistryRef.current.size) {
          fieldsToTransform = value.fields.map((field) => {
            if (!field) return field;
            const identifier = field.name || getFieldIdentifier(field.label || "");
            const originalType = originalTypeRegistryRef.current.get(identifier);

            if (originalType && field.type !== originalType) {
              return { ...field, type: originalType };
            }
            return field;
          });
        }

        const transformed = transformToRouting(
          fieldsToTransform,
          fieldIdMapRef.current,
          previousFieldsRef.current
        );

        previousFieldsRef.current = transformed;
        hookForm.setValue("fields", transformed, { shouldDirty: true, shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [builderForm, hookForm, hasResponses]);

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
          shouldConsiderRequired={(field) => field.required ?? false}
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
        Page={({ hookForm, form }) => <FormEdit hookForm={hookForm} form={form} />}
      />
    </>
  );
}
