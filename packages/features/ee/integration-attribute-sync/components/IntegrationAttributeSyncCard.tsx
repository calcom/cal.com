import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import type { Attribute } from "@calcom/lib/service/attribute/server/getAttributes";
import { Button } from "@calcom/ui/components/button";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { SelectField, Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import type { IntegrationAttributeSync } from "../repositories/IIntegrationAttributeSyncRepository";
import { ISyncFormData } from "../schemas/zod";
import { FieldMappingBuilder } from "./FieldMappingBuilder";
import { RuleBuilder } from "./RuleBuilder";

export interface IIntegrationAttributeSyncCardProps {
  sync?: IntegrationAttributeSync; // Optional for create mode
  credentialOptions: {
    value: string;
    label: string;
  }[];
  teamOptions: {
    value: string;
    label: string;
  }[];
  attributes: Attribute[];
  organizationId: number;
  onSubmit: (data: ISyncFormData) => void;
  isSubmitting: boolean;
  onCancel?: () => void;
  onDelete?: () => void;
}

const IntegrationAttributeSyncCard = (props: IIntegrationAttributeSyncCardProps) => {
  const {
    sync,
    credentialOptions,
    teamOptions,
    attributes,
    organizationId,
    onSubmit,
    onCancel,
    onDelete,
    isSubmitting,
  } = props;
  console.log(sync);

  const isCreateMode = !sync;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Initialize form with sync data or defaults
  const form = useForm<ISyncFormData>({
    defaultValues: sync
      ? {
          id: sync.id,
          name: sync.name,
          credentialId: sync.credentialId ?? 0,
          enabled: sync.enabled,
          organizationId: sync.organizationId,
          ruleId: sync.attributeSyncRules[0]?.id || "",
          rule: sync.attributeSyncRules[0]?.rule || { operator: "AND", conditions: [] },
          syncFieldMappings: Array.isArray(sync.syncFieldMappings) ? sync.syncFieldMappings : [],
        }
      : {
          id: "",
          name: "New Integration Sync",
          credentialId: 0,
          enabled: true,
          organizationId,
          ruleId: "",
          rule: { operator: "AND", conditions: [] },
          syncFieldMappings: [],
        },
  });

  // Update form when sync prop changes (after refetch with new IDs)
  useEffect(() => {
    if (sync) {
      form.reset({
        id: sync.id,
        name: sync.name,
        credentialId: sync.credentialId ?? 0,
        enabled: sync.enabled,
        organizationId: sync.organizationId,
        ruleId: sync.attributeSyncRules[0]?.id || "",
        rule: sync.attributeSyncRules[0]?.rule || { operator: "AND", conditions: [] },
        syncFieldMappings: Array.isArray(sync.syncFieldMappings) ? sync.syncFieldMappings : [],
      });
    }
  }, [sync?.id]);

  const onFormSubmit = (data: ISyncFormData) => {
    onSubmit(data);
  };

  const handleDelete = () => {
    if (!sync) return; // Safety check for create mode
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!sync || !onDelete) return;
    onDelete();
    setShowDeleteDialog(false);
  };

  const formName = form.watch("name");
  const isPending = isSubmitting;

  return (
    <>
      <form onSubmit={form.handleSubmit(onFormSubmit)}>
        <FormCard
          label={formName}
          leftIcon="link"
          collapsible={true}
          isLabelEditable={true}
          onLabelChange={(label) => {
            form.setValue("name", label, { shouldDirty: true });
          }}
          customActions={
            <Controller
              name="enabled"
              control={form.control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            />
          }
          deleteField={
            !isCreateMode && onDelete
              ? {
                  check: () => true,
                  fn: handleDelete,
                }
              : undefined
          }>
          <FormCardBody>
            <div className="space-y-4">
              <div className="bg-default border-subtle rounded-2xl border p-2">
                <div className="ml-2 flex items-center gap-0.5">
                  <div className="border-subtle rounded-lg border p-1">
                    <Icon name="key" className="text-subtle h-4 w-4" />
                  </div>
                  <span className="text-emphasis ml-2 text-sm font-medium">Credential</span>
                </div>
                <div className="mt-2">
                  <Controller
                    name="credentialId"
                    control={form.control}
                    rules={{ required: "Credential is required" }}
                    render={({ field, fieldState }) => (
                      <>
                        <SelectField
                          // label="Credential"
                          placeholder="Select a credential..."
                          options={credentialOptions}
                          value={credentialOptions.find((opt) => Number(opt.value) === field.value) || null}
                          onChange={(option) => field.onChange(Number(option?.value))}
                        />
                        {fieldState.error && (
                          <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                        )}
                      </>
                    )}
                  />
                  <p className="text-subtle mt-1 text-xs">
                    Choose which integration credential to use for syncing attributes
                  </p>
                </div>
              </div>

              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">User Filter Rules</label>
                <Controller
                  name="rule"
                  control={form.control}
                  render={({ field }) => (
                    <RuleBuilder
                      value={field.value}
                      onChange={field.onChange}
                      teamOptions={teamOptions}
                      attributes={attributes ?? []}
                    />
                  )}
                />
                <p className="text-subtle mt-1 text-xs">
                  Define which users to sync based on team membership or attributes
                </p>
              </div>

              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">Field Mappings</label>
                <Controller
                  name="syncFieldMappings"
                  control={form.control}
                  rules={{
                    validate: (mappings) => {
                      // Check for duplicate field name + attribute combinations
                      const seen = new Set<string>();
                      for (const mapping of mappings || []) {
                        const key = `${mapping.integrationFieldName}-${mapping.attributeId}`;
                        if (seen.has(key)) {
                          return "Duplicate field name and attribute combination found";
                        }
                        seen.add(key);
                      }
                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <FieldMappingBuilder
                        value={{ mappings: field.value || [] }}
                        onChange={(fieldMappings) => field.onChange(fieldMappings.mappings)}
                        attributes={attributes ?? []}
                      />
                      {fieldState.error && (
                        <p className="mt-1 text-xs text-red-600">{fieldState.error.message}</p>
                      )}
                    </>
                  )}
                />
                <p className="text-subtle mt-1 text-xs">
                  Map integration field names to Cal.com attributes for syncing
                </p>
              </div>

              <div className="border-subtle flex justify-end gap-2 border-t pt-4">
                {isCreateMode && onCancel && (
                  <Button type="button" color="secondary" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" loading={isPending} disabled={!form.formState.isDirty}>
                  {isCreateMode ? "Create" : "Save"}
                </Button>
              </div>
            </div>
          </FormCardBody>
        </FormCard>
      </form>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmationDialogContent
          variety="danger"
          title="Delete Attribute Sync"
          confirmBtnText="Delete"
          onConfirm={confirmDelete}>
          Are you sure you want to delete this sync? This action cannot be undone.
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};

export default IntegrationAttributeSyncCard;
