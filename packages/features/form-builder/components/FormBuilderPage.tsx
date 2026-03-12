/**
 * FormBuilderPage.tsx
 *
 * Root component replacing FormEdit. Passed as `Page` render prop to SingleForm.
 *
 * STATE ARCHITECTURE — critical fix:
 *   useFieldArray.fields is a snapshot and does NOT update when setValue is called.
 *   Solution: use hookForm.watch("fields") for reactive reads everywhere.
 *   useFieldArray is used ONLY for structural mutations (append/remove/swap/insert).
 *
 * All field property edits go through:
 *   hookForm.setValue(`fields.${index}.key`, value, { shouldDirty: true })
 *
 * Form-level visual config (header, style, submitButton) lives in local state
 * since it maps to uiConfig on the form, not the backend fields array.
 */
"use client";

import React, { useState, useCallback } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { FieldLibrary } from "./FieldLibrary";
import { FormCanvas } from "./FormCanvas";
import { FieldSettingsPanel } from "./FieldSettingsPanel";
import type { BuilderField, UIFieldType, FormLevelConfig } from "./builderTypes";
import { createBuilderField, resolveFormConfig } from "./builderTypes";
import type { RoutingFormWithResponseCount } from "../../types/types";

interface FormBuilderPageProps {
  hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  form: any;
  appUrl: string;
  uptoDateForm?: any;
}

export function FormBuilderPage({ hookForm, form, appUrl }: FormBuilderPageProps) {
  // ── Local UI state ──────────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const settings = hookForm.watch("settings") ?? {};
  const formConfig = resolveFormConfig(
    (settings as { uiConfig?: Partial<FormLevelConfig> }).uiConfig ?? null,
    {
      title: form?.name ?? "",
      subtitle: form?.description ?? "",
    }
  );

  // ── useFieldArray — structural mutations only ───────────────────────────
  const { append, remove, move, insert } = useFieldArray({
    control: hookForm.control,
    name: "fields",
    // @ts-ignore keyName override
    keyName: "_rhfId",
  });

  // ── REACTIVE READ: watch gives us live updates after setValue ───────────
  const fields = (hookForm.watch("fields") ?? []) as unknown as BuilderField[];

  // ── Add field ───────────────────────────────────────────────────────────
  const handleAddField = useCallback(
    (type: UIFieldType, atIndex?: number) => {
      const newField = createBuilderField(type);
      const insertAt = atIndex !== undefined ? atIndex : fields.length;
      if (atIndex !== undefined && atIndex >= 0 && atIndex < fields.length) {
        insert(atIndex, newField as any);
      } else {
        append(newField as any);
      }
      setSelectedIndex(insertAt);
    },
    [append, insert, fields.length]
  );

  // ── Reorder ─────────────────────────────────────────────────────────────
  const handleReorder = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const clamped = Math.max(0, Math.min(to, fields.length - 1));
      if (clamped === from) return;
      move(from, clamped);
      if (selectedIndex === null) return;
      if (selectedIndex === from) {
        setSelectedIndex(clamped);
        return;
      }
      if (from < clamped) {
        if (selectedIndex > from && selectedIndex <= clamped) {
          setSelectedIndex(selectedIndex - 1);
        }
      } else {
        if (selectedIndex >= clamped && selectedIndex < from) {
          setSelectedIndex(selectedIndex + 1);
        }
      }
    },
    [move, fields.length, selectedIndex]
  );

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (index: number) => {
      remove(index);
      if (selectedIndex === index) setSelectedIndex(null);
      else if (selectedIndex !== null && selectedIndex > index)
        setSelectedIndex(selectedIndex - 1);
    },
    [remove, selectedIndex]
  );

  // ── Duplicate ───────────────────────────────────────────────────────────
  const handleDuplicate = useCallback(
    (index: number) => {
      const original = fields[index];
      if (!original) return;
      const dup: BuilderField = {
        ...original,
        id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: original.label ? `${original.label} (copy)` : "",
        identifier: original.identifier ? `${original.identifier}_copy` : "",
      };
      insert(index + 1, dup as any);
      setSelectedIndex(index + 1);
    },
    [fields, insert]
  );

  // ── Update individual field property ────────────────────────────────────
  const handleUpdateField = useCallback(
    (updates: Partial<BuilderField>) => {
      if (selectedIndex === null) return;
      Object.entries(updates).forEach(([key, value]) => {
        hookForm.setValue(`fields.${selectedIndex}.${key}` as any, value, {
          shouldDirty: true,
        });
      });
    },
    [hookForm, selectedIndex]
  );

  // ── Update uiConfig sub-object ──────────────────────────────────────────
  const handleUpdateUIConfig = useCallback(
    (updates: Partial<BuilderField["uiConfig"]>) => {
      if (selectedIndex === null) return;
      const current = fields[selectedIndex]?.uiConfig ?? {};
      hookForm.setValue(
        `fields.${selectedIndex}.uiConfig` as any,
        { ...current, ...updates },
        { shouldDirty: true }
      );
    },
    [hookForm, selectedIndex, fields]
  );

  const selectedField = selectedIndex !== null ? fields[selectedIndex] ?? null : null;

  return (
    <div className="flex h-[calc(100vh-56px)] w-full overflow-hidden bg-muted/20">
      {/* Left: Field Library */}
      <div className="w-52 min-h-0 h-full flex-shrink-0 overflow-hidden border-r border-border bg-card">
        <FieldLibrary onAddField={handleAddField} />
      </div>

      {/* Center: Form Canvas */}
      <div className="flex-1 min-w-0 min-h-0">
        <FormCanvas
          fields={fields}
          selectedFieldIndex={selectedIndex}
          formConfig={formConfig}
          onSelectField={setSelectedIndex}
          onReorder={handleReorder}
          onDropNewField={(type, atIndex) => handleAddField(type as UIFieldType, atIndex)}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </div>

      {/* Right: Settings Panel */}
      <div className="w-64 min-h-0 h-full flex-shrink-0 overflow-hidden border-l border-border bg-card">
        <FieldSettingsPanel
          field={selectedField}
          selectedIndex={selectedIndex}
          formConfig={formConfig}
          onUpdate={handleUpdateField}
          onUpdateUIConfig={handleUpdateUIConfig}
          onUpdateFormConfig={(updates) => {
            const current = hookForm.getValues("settings") ?? { emailOwnerOnSubmission: true };
            const currentUIConfig = (current as { uiConfig?: Partial<FormLevelConfig> }).uiConfig;
            const baseUIConfig =
              currentUIConfig ??
              ({
                header: {
                  title: form?.name ?? "",
                  subtitle: form?.description ?? "",
                },
              } as Partial<FormLevelConfig>);
            const next = resolveFormConfig({
              ...baseUIConfig,
              ...updates,
            });
            hookForm.setValue(
              "settings",
              {
                ...current,
                uiConfig: next,
              },
              { shouldDirty: true }
            );
          }}
          onDelete={() => selectedIndex !== null && handleDelete(selectedIndex)}
          onDuplicate={() => selectedIndex !== null && handleDuplicate(selectedIndex)}
        />
      </div>
    </div>
  );
}
