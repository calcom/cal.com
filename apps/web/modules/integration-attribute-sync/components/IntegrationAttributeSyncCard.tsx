import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { Attribute } from "@calcom/app-store/routing-forms/types/types";
import { Button } from "@calcom/ui/components/button";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { SelectField, Switch } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";

import {
  type IntegrationAttributeSync,
  type ISyncFormData,
  RuleOperatorEnum,
} from "@calcom/features/ee/integration-attribute-sync/repositories/IIntegrationAttributeSyncRepository";
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
  attributeOptions: {
    value: string;
    label: string;
  }[];
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
    attributeOptions,
    organizationId,
    onSubmit,
    onCancel,
    onDelete,
    isSubmitting,
  } = props;

  const { t } = useLocale();
  const isCreateMode = !sync;
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Initialize form with sync data or defaults
  const form = useForm<ISyncFormData>({
    defaultValues: sync
      ? {
          id: sync.id,
          name: sync.name,
          credentialId: sync.credentialId ?? undefined,
          enabled: sync.enabled,
          organizationId: sync.organizationId,
          ruleId: sync.attributeSyncRule?.id || "",
          rule: sync.attributeSyncRule?.rule || {
            operator: RuleOperatorEnum.AND,
            conditions: [],
          },
          syncFieldMappings: Array.isArray(sync.syncFieldMappings) ? sync.syncFieldMappings : [],
        }
      : {
          id: "",
          name: t("attribute_sync_new_integration_sync"),
          credentialId: undefined,
          enabled: true,
          organizationId,
          ruleId: "",
          rule: { operator: RuleOperatorEnum.AND, conditions: [] },
          syncFieldMappings: [],
        },
  });

  // Update form when sync prop changes (after refetch with new IDs)
  useEffect(() => {
    if (sync) {
      form.reset({
        id: sync.id,
        name: sync.name,
        credentialId: sync.credentialId ?? undefined,
        enabled: sync.enabled,
        organizationId: sync.organizationId,
        ruleId: sync.attributeSyncRule?.id || "",
        rule: sync.attributeSyncRule?.rule || {
          operator: RuleOperatorEnum.AND,
          conditions: [],
        },
        syncFieldMappings: Array.isArray(sync.syncFieldMappings) ? sync.syncFieldMappings : [],
      });
    }
    // Only need to run if the sync changes
  }, [sync?.id]);

  const onFormSubmit = (data: ISyncFormData) => {
    onSubmit(data);
  };

  const handleDelete = () => {
    if (!sync) return;
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
                  <span className="text-emphasis ml-2 text-sm font-medium">
                    {t("attribute_sync_credential")}
                  </span>
                </div>
                <div className="mt-2">
                  <Controller
                    name="credentialId"
                    control={form.control}
                    rules={{
                      required: t("attribute_sync_credential_required"),
                      validate: (value) => {
                        if (!value || value <= 0) {
                          return t("attribute_sync_credential_validation");
                        }
                        return true;
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <SelectField
                          placeholder={t("attribute_sync_select_credential")}
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
                  <p className="text-subtle mt-1 text-xs">{t("attribute_sync_credential_description")}</p>
                </div>
              </div>

              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">
                  {t("attribute_sync_user_filter_rules")}
                </label>
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
                  {t("attribute_sync_user_filter_rules_description")}
                </p>
              </div>

              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">
                  {t("attribute_sync_field_mappings")}
                </label>
                <Controller
                  name="syncFieldMappings"
                  control={form.control}
                  rules={{
                    validate: (mappings) => {
                      const seenAttributes = new Set<string>();
                      for (const mapping of mappings || []) {
                        if (mapping.attributeId && seenAttributes.has(mapping.attributeId)) {
                          return t("attribute_sync_duplicate_attribute_mapping");
                        }
                        if (mapping.attributeId) seenAttributes.add(mapping.attributeId);
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <FieldMappingBuilder
                      value={{ mappings: field.value || [] }}
                      onChange={(fieldMappings) => field.onChange(fieldMappings.mappings)}
                      attributeOptions={attributeOptions}
                    />
                  )}
                />
                <p className="text-subtle mt-1 text-xs">{t("attribute_sync_field_mappings_description")}</p>
              </div>

              <div className="border-subtle flex justify-end gap-2 border-t pt-4">
                {isCreateMode && onCancel && (
                  <Button type="button" color="secondary" onClick={onCancel}>
                    {t("cancel")}
                  </Button>
                )}
                <Button type="submit" loading={isPending} disabled={!form.formState.isDirty}>
                  {isCreateMode ? t("create") : t("save")}
                </Button>
              </div>
            </div>
          </FormCardBody>
        </FormCard>
      </form>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <ConfirmationDialogContent
          variety="danger"
          title={t("attribute_sync_delete_title")}
          confirmBtnText={t("delete")}
          onConfirm={confirmDelete}>
          {t("attribute_sync_delete_confirmation")}
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
};

export default IntegrationAttributeSyncCard;
