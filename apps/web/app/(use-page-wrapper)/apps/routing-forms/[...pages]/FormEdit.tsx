"use client";

import {
  type FormBuilderField,
  transformToBuilder,
  transformToRouting,
} from "@calcom/app-store/routing-forms/lib/formBuilderAdapters";
import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
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

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;
type RoutingField = NonNullable<RoutingFormWithResponseCount["fields"]>[number];

type FormBuilderFormValues = {
  fields: FormBuilderField[];
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
  const hasResponses = (form._count?.responses ?? 0) > 0;

  const fieldIdMapRef = useRef(new Map<string, string>());
  const originalTypeRegistryRef = useRef(new Map<string, string>());
  const lastParentFieldsRef = useRef<RoutingField[]>([]);
  const lastFormFieldIdsRef = useRef<string[]>(
    (form.fields ?? []).map((f) => f.id ?? "")
  );

  const builderForm = useForm<FormBuilderFormValues>({
    defaultValues: {
      fields: transformToBuilder(hookForm.getValues("fields"), hasResponses),
    },
    mode: "onChange",
  });

  const syncRefsFromParent = (parentFields: RoutingField[]) => {
    lastParentFieldsRef.current = parentFields;
    fieldIdMapRef.current = new Map(
      parentFields.map((rf: RoutingField) => {
        const name = rf.identifier || getFieldIdentifier(rf.label ?? "").toLowerCase();
        return [name, rf.id ?? ""];
      })
    );
    originalTypeRegistryRef.current = new Map(
      parentFields.map((rf: RoutingField) => {
        const name = rf.identifier || getFieldIdentifier(rf.label ?? "").toLowerCase();
        return [name, rf.type ?? "text"];
      })
    );
  };

  const parentMatchesLast = (parentFields: RoutingField[]) => {
    const last = lastParentFieldsRef.current;
    return (
      last.length === parentFields.length &&
      parentFields.every((p, i) => p.id === last[i]?.id)
    );
  };

  const dedupeParentFieldsById = (fields: RoutingField[]): RoutingField[] => {
    const seen = new Set<string>();
    return fields.filter((f) => {
      const id = f.id ?? "";
      if (id && seen.has(id)) return false;
      if (id) seen.add(id);
      return true;
    });
  };

  const formFieldIdsChanged = () => {
    const current = (form.fields ?? []).map((f) => f.id ?? "");
    const last = lastFormFieldIdsRef.current;
    return (
      current.length !== last.length ||
      current.some((id, i) => id !== last[i])
    );
  };

  // Sync from parent to local only when parent is source of truth (initial load, server update, or empty).
  // Do not reset when parent matches what we last wrote (edit/reorder) to avoid overwriting user changes.
  useEffect(() => {
    const rawParent = (hookForm.getValues("fields") ?? []) as RoutingField[];
    const parentFields = dedupeParentFieldsById(rawParent);
    if (parentFields.length < rawParent.length) {
      syncRefsFromParent(parentFields);
      hookForm.setValue("fields", parentFields, {
        shouldDirty: true,
        shouldValidate: true,
      });
      builderForm.reset({
        fields: transformToBuilder(parentFields, hasResponses),
      });
      return;
    }
    const localFields = builderForm.getValues("fields") ?? [];
    const last = lastParentFieldsRef.current;
    const formFieldsChanged = formFieldIdsChanged();
    const matchesLast = parentMatchesLast(parentFields);

    if (parentFields.length === 0) {
      builderForm.reset({ fields: [] });
      fieldIdMapRef.current.clear();
      originalTypeRegistryRef.current.clear();
      lastParentFieldsRef.current = [];
      lastFormFieldIdsRef.current = (form.fields ?? []).map((f) => f.id ?? "");
      return;
    }

    if (formFieldsChanged) {
      lastFormFieldIdsRef.current = (form.fields ?? []).map((f) => f.id ?? "");
      const nextBuilderFields = transformToBuilder(parentFields, hasResponses);
      builderForm.reset({ fields: nextBuilderFields });
      syncRefsFromParent(parentFields);
      return;
    }

    if (matchesLast) {
      return;
    }

    if (localFields.length === 0 || parentFields.length !== localFields.length) {
      const nextBuilderFields = transformToBuilder(parentFields, hasResponses);
      builderForm.reset({ fields: nextBuilderFields });
      syncRefsFromParent(parentFields);
    } else {
      lastParentFieldsRef.current = parentFields;
    }
  }, [hookForm, builderForm, form, form.fields, hasResponses]);

  // Sync from local to parent (on FormBuilder change)
  useEffect(() => {
    const subscription = builderForm.watch((value) => {
      const builderFields = value.fields;
      if (!builderFields) return;

      const transformed = transformToRouting(builderFields, fieldIdMapRef.current, {
        previousParentFields: lastParentFieldsRef.current,
        hasResponses,
        originalTypeRegistry: originalTypeRegistryRef.current,
      });
      lastParentFieldsRef.current = transformed;
      hookForm.setValue("fields", transformed, {
        shouldDirty: true,
        shouldValidate: true,
      });
    });
    return () => subscription.unsubscribe();
  }, [builderForm, hookForm, hasResponses]);

  return (
    <div className="p-4 w-full">
      <FormProvider {...builderForm}>
        <FormBuilder
          title={""}
          description={""}
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
        Page={({ hookForm, form }) => <FormEdit appUrl={appUrl} hookForm={hookForm} form={form} />}
      />
    </>
  );
}
