"use client";

import { useEffect, useRef } from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Toaster } from "sonner";
import { v4 as uuidv4 } from "uuid";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { getFieldIdentifier } from "@calcom/features/form-builder/utils/getFieldIdentifier";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { getServerSidePropsForSingleFormView as getServerSideProps } from "@calcom/web/lib/apps/routing-forms/[...pages]/getServerSidePropsSingleForm";
import { FormBuilder } from "@calcom/web/modules/event-types/components/tabs/advanced/FormBuilder";
import SingleForm from "@components/apps/routing-forms/SingleForm";
import type { inferSSRProps } from "@lib/types/inferSSRProps";

import { toFormBuilderField, toRoutingField } from "./formEditUtils";
import type { RoutingField, FormBuilderField, FormBuilderFields } from "./formEditUtils";

// ─── Local type helpers ───────────────────────────────────────────────────────

type FormBuilderFormValues = {
  bookingFields: FormBuilderFields;
};

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
 *  5. When the form has existing responses (`form._count.responses > 0`), the
 *     type of existing fields is locked via `editable: "system-but-optional"` and
 *     guarded in the watch subscription, restoring the previous `disableTypeChange`
 *     behaviour and preventing invalidation of stored response data.
 */
function FormEdit({
  hookForm,
  form,
}: {
  hookForm: HookForm;
  form: inferSSRProps<typeof getServerSideProps>["form"];
}) {
  const { t } = useLocale();

  // When the form already has responses, locking type changes prevents
  // invalidating stored response data (restores previous disableTypeChange behaviour).
  const hasResponses = (form._count?.responses ?? 0) > 0;

  // Latest routing fields (updated reactively)
  const routingFields = hookForm.watch("fields") ?? [];

  // ── Shadow form that FormBuilder will directly read / write ──────────────
  const builderForm = useForm<FormBuilderFormValues>({
    defaultValues: {
      bookingFields: routingFields.map((f) => toFormBuilderField(f, hasResponses)),
    },
  });

  // ── Stable id registry: maps builder field identifier (bf.name) → routing field id ──
  // Using name (identifier) as key rather than array index ensures IDs are preserved
  // correctly when fields are reordered or deleted, not just renamed.
  //
  // Why name-keyed vs position-keyed:
  //   - Position-keyed: breaks on reorder/delete (field at index 0 gets a different id
  //     if the original index-0 field is deleted or moved)
  //   - Name-keyed: the `name` (identifier) field travels with the field on reorder/delete,
  //     so the correct routing-field id is always retrieved. If a user explicitly changes
  //     the identifier, a new UUID is generated (acceptable — the old routing condition
  //     is already tied to the old identifier string anyway).
  const fieldIdRegistryRef = useRef<Map<string, string>>(
    new Map(
      (hookForm.getValues("fields") ?? []).map((rf) => {
        const name = rf.identifier ?? getFieldIdentifier(rf.label ?? "").toLowerCase();
        return [name, rf.id ?? uuidv4()];
      })
    )
  );

  // ── Original type registry: maps field identifier → original type ──────────
  // Used as a defence-in-depth guard: if hasResponses and a type somehow changed
  // (e.g. a future FormBuilder version ignores editable), we revert it here.
  const originalTypeRegistryRef = useRef<Map<string, string>>(
    new Map(
      (hookForm.getValues("fields") ?? []).map((rf) => {
        const name = rf.identifier ?? getFieldIdentifier(rf.label ?? "").toLowerCase();
        return [name, rf.type ?? "text"];
      })
    )
  );

  // ── Original routing field registry: maps identifier → original RoutingField ──
  // Preserves router-specific metadata (routerId/router/routerField) so that
  // linked-router fields are not silently stripped when the form is saved.
  const originalRoutingFieldRef = useRef<Map<string, RoutingField>>(
    new Map(
      (hookForm.getValues("fields") ?? []).map((rf) => {
        const name = rf.identifier ?? getFieldIdentifier(rf.label ?? "").toLowerCase();
        return [name, rf];
      })
    )
  );

  // ── Watch the shadow form and sync changes → routing form ─────────────────
  useEffect(() => {
    const subscription = builderForm.watch((values) => {
      const builderFields = values.bookingFields as FormBuilderFields | undefined;
      if (!builderFields) return;

      const registry = fieldIdRegistryRef.current;
      const originalTypes = originalTypeRegistryRef.current;
      const originalRoutingFields = originalRoutingFieldRef.current;

      // Map each builder field to a routing field, preserving the stable id
      // from the registry (keyed by identifier, not by position).
      const updatedRoutingFields = builderFields.map((bf) => {
        if (!bf) return null;
        const name = bf.name;
        // Look up id by identifier; assign a new UUID for truly new fields.
        if (!registry.has(name)) {
          registry.set(name, uuidv4());
        }

        // Defence-in-depth: revert type changes for existing fields when the
        // form already has responses, regardless of FormBuilder's editable prop.
        let resolvedBf = bf as FormBuilderField;
        if (hasResponses && originalTypes.has(name)) {
          const lockedType = originalTypes.get(name) as FormBuilderField["type"];
          if (resolvedBf.type !== lockedType) {
            resolvedBf = { ...resolvedBf, type: lockedType };
          }
        }

        // Pass the original routing field so router-specific metadata
        // (routerId/router/routerField) is preserved and not silently dropped.
        return toRoutingField(resolvedBf, registry.get(name), originalRoutingFields.get(name));
      });

      hookForm.setValue(
        "fields",
        updatedRoutingFields.filter(Boolean) as RoutingField[],
        { shouldDirty: true }
      );
    });

    return () => subscription.unsubscribe();
    // hookForm is stable; builderForm is stable; hasResponses is stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderForm, hookForm, hasResponses]);

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
