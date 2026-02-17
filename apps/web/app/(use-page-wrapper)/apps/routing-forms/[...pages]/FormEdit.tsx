"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import type { fieldsSchema } from "@calcom/features/form-builder/schema";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import { FormBuilder } from "@calcom/web/modules/event-types/components/tabs/advanced/FormBuilder";
import SingleForm from "@components/apps/routing-forms/SingleForm";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

// ─── Type helpers ─────────────────────────────────────────────────────────────

type RoutingField = NonNullable<RoutingFormWithResponseCount["fields"]>[number];
type FormBuilderFields = z.infer<typeof fieldsSchema>;
type FormBuilderField = FormBuilderFields[number];

type FormBuilderFormValues = {
  bookingFields: FormBuilderFields;
};

// ─── Field adapters ───────────────────────────────────────────────────────────

/**
 * Convert a routing-form field → FormBuilder field.
 *
 * Mapping:
 *   routing `identifier` (or slugified `label`) → FormBuilder `name`
 *   routing `label`                              → FormBuilder `label`
 *   routing `type`                               → FormBuilder `type`
 *   routing `options[].id`                       → FormBuilder `options[].value`
 */
function toFormBuilderField(field: RoutingField): FormBuilderField {
  const name = field.identifier
    ? field.identifier
    : getFieldIdentifier(field.label ?? "").toLowerCase();

  return {
    name,
    label: field.label ?? "",
    type: (field.type ?? "text") as FormBuilderField["type"],
    required: field.required ?? false,
    placeholder: field.placeholder ?? "",
    options: field.options?.map((opt) => ({
      label: opt.label,
      value: opt.id ?? opt.label,
    })),
    editable: "user",
    sources: [
      {
        label: "User",
        type: "user" as const,
        id: "user",
        fieldRequired: field.required ?? false,
      },
    ],
  };
}

/**
 * Convert a FormBuilder field → routing-form field.
 * Preserves the original `id` so RAQB conditions continue to work.
 */
function toRoutingField(builderField: FormBuilderField, originalId?: string): RoutingField {
  const bf = builderField as FormBuilderField & {
    required?: boolean;
    placeholder?: string;
    options?: { label: string; value: string }[];
  };

  return {
    id: originalId ?? uuidv4(),
    label: bf.label ?? bf.name,
    identifier: bf.name,
    type: bf.type,
    required: bf.required ?? false,
    placeholder: bf.placeholder ?? "",
    options: bf.options?.map((opt) => ({ label: opt.label, id: opt.value })),
  } as RoutingField;
}

// ─── FormEdit component ───────────────────────────────────────────────────────

type HookForm = UseFormReturn<RoutingFormWithResponseCount>;

/**
 * Replaces the old inline-field editor with the same FormBuilder dialog UI
 * that event-types use for "Booking Questions".
 *
 * Architecture:
 *  1. A *shadow* react-hook-form (`builderForm`) holds FormBuilder-compatible
 *     fields under the `bookingFields` key.
 *  2. FormBuilder reads from / writes to this shadow form via `formProp="bookingFields"`.
 *  3. We `watch` the shadow form and sync any changes back to the parent routing
 *     form's `fields` array, converting field schemas as we go.
 *  4. Original routing-form field `id`s are preserved so existing RAQB routing
 *     conditions keep matching.
 */
function FormEdit({
  hookForm,
  form,
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
}) {
  const { t } = useLocale();

  // Latest routing fields (updated reactively)
  const routingFields = hookForm.watch("fields") ?? [];

  // ── Shadow form that FormBuilder will directly read / write ──────────────
  const builderForm = useForm<FormBuilderFormValues>({
    defaultValues: {
      bookingFields: routingFields.map(toFormBuilderField),
    },
  });

  // ── Watch the shadow form and sync changes → routing form ─────────────────
  useEffect(() => {
    const subscription = builderForm.watch((values) => {
      const builderFields = values.bookingFields as FormBuilderFields | undefined;
      if (!builderFields) return;

      // Re-fetch the *current* routing fields at sync time so we match
      // the latest identifiers, not the stale closure value
      const currentRoutingFields = hookForm.getValues("fields") ?? [];

      const updatedRoutingFields = builderFields.map((bf) => {
        if (!bf) return null;
        const original = currentRoutingFields.find(
          (rf) =>
            (rf.identifier ?? getFieldIdentifier(rf.label ?? "").toLowerCase()) === bf.name
        );
        return toRoutingField(bf as FormBuilderField, original?.id);
      });

      hookForm.setValue(
        "fields",
        updatedRoutingFields.filter(Boolean) as RoutingField[],
        { shouldDirty: true }
      );
    });

    return () => subscription.unsubscribe();
    // hookForm is stable; builderForm is stable. No deps needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderForm, hookForm]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <FormProvider {...builderForm}>
      <div className="w-full py-4 lg:py-8">
        <FormBuilder
          title={t("questions")}
          description={t("all_info_your_booker_provide")}
          addFieldLabel={t("add_a_booking_question")}
          formProp="bookingFields"
          disabled={false}
          LockedIcon={false}
          dataStore={{ options: {} }}
        />
      </div>
    </FormProvider>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

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
