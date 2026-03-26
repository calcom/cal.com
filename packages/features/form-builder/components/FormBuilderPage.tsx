"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@calid/features/ui/components/dialog";
import React, { useState, useCallback, useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";

import type { RoutingFormWithResponseCount } from "@calcom/app-store/routing-forms/types/types";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import useMediaQuery from "@calcom/lib/hooks/useMediaQuery";
import { Button } from "@calcom/ui/components/button";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";

import { FieldLibrary } from "./FieldLibrary";
import { FieldSettingsPanel } from "./FieldSettingsPanel";
import { FormCanvas } from "./FormCanvas";
import type { BuilderField, UIFieldType, FormLevelConfig } from "./builderTypes";
import { createBuilderField, resolveFormConfig } from "./builderTypes";

interface FormBuilderPageProps {
  hookForm: UseFormReturn<RoutingFormWithResponseCount>;
  form: any;
  appUrl: string;
  uptoDateForm?: any;
  showCanvasSkeleton?: boolean;
}

function FormCanvasSkeleton() {
  return (
    <div className="bg-muted/20 h-full w-full p-6">
      <SkeletonContainer className="bg-default border-subtle mx-auto h-full w-full max-w-3xl rounded-xl border p-6">
        <div className="space-y-4">
          <SkeletonText className="h-8 w-56" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-subtle rounded-lg border p-4">
              <SkeletonText className="mb-3 h-4 w-40" />
              <SkeletonText className="h-10 w-full" />
            </div>
          ))}
          <SkeletonText className="h-10 w-36" />
        </div>
      </SkeletonContainer>
    </div>
  );
}

export function FormBuilderPage({
  hookForm,
  form,
  appUrl: _appUrl,
  showCanvasSkeleton = false,
}: FormBuilderPageProps) {
  const { t } = useLocale();
  const isNarrowLayout = useMediaQuery("(max-width: 1023px)");
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const settings = hookForm.watch("settings") ?? {};
  const formConfig = resolveFormConfig(
    (settings as { uiConfig?: Partial<FormLevelConfig> }).uiConfig ?? null,
    {
      title: form?.name ?? "",
      subtitle: form?.description ?? "",
    }
  );

  const { append, remove, move, insert } = useFieldArray<RoutingFormWithResponseCount, "fields", "_rhfId">({
    control: hookForm.control,
    name: "fields",
    keyName: "_rhfId",
  });

  const fields = (hookForm.watch("fields") ?? []) as unknown as BuilderField[];

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

  const handleDelete = useCallback(
    (index: number) => {
      remove(index);
      if (selectedIndex === index) setSelectedIndex(null);
      else if (selectedIndex !== null && selectedIndex > index) setSelectedIndex(selectedIndex - 1);
    },
    [remove, selectedIndex]
  );

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

  const onUpdateFormConfig = useCallback(
    (updates: Partial<FormLevelConfig>) => {
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
    },
    [hookForm, form?.name, form?.description]
  );

  const fieldSettingsPanel = (
    <FieldSettingsPanel
      field={selectedField}
      selectedIndex={selectedIndex}
      formConfig={formConfig}
      onUpdate={handleUpdateField}
      onUpdateUIConfig={handleUpdateUIConfig}
      onUpdateFormConfig={onUpdateFormConfig}
      onDelete={() => selectedIndex !== null && handleDelete(selectedIndex)}
      onDuplicate={() => selectedIndex !== null && handleDuplicate(selectedIndex)}
    />
  );

  useEffect(() => {
    if (!isNarrowLayout) return;
    if (selectedIndex !== null) setSettingsDialogOpen(true);
  }, [selectedIndex, isNarrowLayout]);

  useEffect(() => {
    if (selectedIndex === null) setSettingsDialogOpen(false);
  }, [selectedIndex]);

  const openLibraryDialog = () => {
    setSettingsDialogOpen(false);
    setLibraryDialogOpen(true);
  };

  const addFieldFromDialog = useCallback(
    (type: UIFieldType) => {
      handleAddField(type);
      setLibraryDialogOpen(false);
    },
    [handleAddField]
  );

  const handleEditFieldProperties = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      if (isNarrowLayout) setSettingsDialogOpen(true);
    },
    [isNarrowLayout]
  );

  return (
    <>
      <div className="border-border flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-md border max-lg:h-[calc(100dvh-11rem)] max-lg:max-h-[calc(100dvh-11rem)] lg:h-[min(100dvh,56rem)] lg:max-h-[calc(100dvh-10.5rem)] lg:flex-row">
        {/* Desktop / tablet lg+: field library sidebar */}
        {!isNarrowLayout && (
          <div className="border-border bg-card flex h-full min-h-0 w-52 flex-shrink-0 flex-col overflow-hidden border-r">
            <FieldLibrary onAddField={handleAddField} variant="sidebar" />
          </div>
        )}

        {/* Phone & tablet: toolbar + full-width canvas only (no inline library / settings) */}
        {isNarrowLayout && (
          <div className="border-subtle bg-muted/30 flex shrink-0 flex-wrap items-center justify-end gap-2 border-b px-3 py-2.5">
            <Button
              type="button"
              color="secondary"
              size="sm"
              className="min-h-10"
              data-testid="form-builder-add-fields"
              onClick={openLibraryDialog}>
              {t("form_builder_add_fields")}
            </Button>
          </div>
        )}

        <div className="min-h-0 w-full min-w-0 flex-1 lg:min-h-0">
          {showCanvasSkeleton ? (
            <FormCanvasSkeleton />
          ) : (
            <FormCanvas
              fields={fields}
              selectedFieldIndex={selectedIndex}
              formConfig={formConfig}
              onSelectField={setSelectedIndex}
              onReorder={handleReorder}
              onDropNewField={(type, atIndex) => handleAddField(type as UIFieldType, atIndex)}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onEditFieldProperties={handleEditFieldProperties}
            />
          )}
        </div>

        {!isNarrowLayout && (
          <div className="border-border bg-card flex min-h-0 w-64 flex-none flex-shrink-0 flex-col overflow-hidden border-l lg:border-t-0">
            {fieldSettingsPanel}
          </div>
        )}
      </div>

      {isNarrowLayout && (
        <>
          <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
            <DialogContent
              size="md"
              showCloseButton
              enableOverflow={false}
              className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
              <div className="border-subtle shrink-0 border-b px-6 pb-4 pt-6">
                <DialogHeader className="space-y-0">
                  <DialogTitle>{t("form_builder_add_fields")}</DialogTitle>
                </DialogHeader>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2">
                <FieldLibrary variant="sheet" onAddField={addFieldFromDialog} />
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={settingsDialogOpen && selectedIndex !== null}
            onOpenChange={(open) => {
              setSettingsDialogOpen(open);
            }}>
            <DialogContent
              size="lg"
              showCloseButton
              enableOverflow={false}
              className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
              <div className="border-subtle shrink-0 border-b px-6 pb-4 pt-6 sm:px-8">
                <DialogHeader className="space-y-0">
                  <DialogTitle>{t("form_builder_field_properties")}</DialogTitle>
                </DialogHeader>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-0 sm:px-8">
                {fieldSettingsPanel}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}
