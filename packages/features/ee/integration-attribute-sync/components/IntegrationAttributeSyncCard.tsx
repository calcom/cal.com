import { useForm, Controller } from "react-hook-form";

import type { Attribute } from "@calcom/lib/service/attribute/server/getAttributes";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import { SelectField, Switch } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import type { IntegrationAttributeSync } from "../repositories/IIntegrationAttributeSyncRepository";
import { ISyncFormData } from "../schemas/zod";
import { FieldMappingBuilder } from "./FieldMappingBuilder";
import { RuleBuilder } from "./RuleBuilder";

interface IIntegrationAttributeSyncCardProps {
  sync: IntegrationAttributeSync;
  credentialOptions: {
    value: string;
    label: string;
  }[];
  teamOptions: {
    value: string;
    label: string;
  }[];
  attributes: Attribute[];
}

const IntegrationAttributeSyncCard = (props: IIntegrationAttributeSyncCardProps) => {
  const { sync, credentialOptions, teamOptions, attributes } = props;

  const utils = trpc.useUtils();

  // Initialize form with sync data
  const form = useForm<ISyncFormData>({
    defaultValues: {
      credentialId: sync.credentialId ?? 0,
      enabled: sync.enabled,
      rule: sync.attributeSyncRules[0]?.rule || { operator: "AND", conditions: [] },
      syncFieldMappings: sync.syncFieldMappings || [],
    },
  });

  const updateMutation = trpc.viewer.attributeSync.updateAttributeSync.useMutation({
    onSuccess: () => {
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      showToast("Attribute sync updated successfully", "success");
      form.reset(form.getValues()); // Reset dirty state
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.attributeSync.deleteAttributeSync.useMutation({
    onSuccess: () => {
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      showToast("Attribute sync deleted successfully", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit = (data: ISyncFormData) => {
    console.log("Form data:", data);
    updateMutation.mutate({
      id: sync.id,
      credentialId: data.credentialId,
      enabled: data.enabled,
      organizationId: sync.organizationId,
      rule: data.rule,
      syncFieldMappings: data.syncFieldMappings || [],
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this sync?")) {
      deleteMutation.mutate({ id: sync.id });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormCard
        label={`${sync.integration} Sync`}
        leftIcon="link"
        collapsible={true}
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
        deleteField={{
          check: () => true,
          fn: handleDelete,
        }}>
        <FormCardBody>
          <div className="space-y-4">
            {/* Credential Selection */}
            <div>
              <Controller
                name="credentialId"
                control={form.control}
                rules={{ required: "Credential is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <SelectField
                      label="Credential"
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

            {/* Rule Builder */}
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

            {/* Field Mapping Builder */}
            <div>
              <label className="text-emphasis mb-2 block text-sm font-medium">Field Mappings</label>
              <Controller
                name="syncFieldMappings"
                control={form.control}
                render={({ field }) => (
                  <FieldMappingBuilder
                    value={{ mappings: field.value || [] }}
                    onChange={(fieldMappings) => field.onChange(fieldMappings.mappings)}
                    attributes={attributes ?? []}
                  />
                )}
              />
              <p className="text-subtle mt-1 text-xs">
                Map integration field names to Cal.com attributes for syncing
              </p>
            </div>

            {/* Save Button */}
            <div className="border-subtle flex justify-end gap-2 border-t pt-4">
              <Button type="submit" loading={updateMutation.isPending} disabled={!form.formState.isDirty}>
                Save
              </Button>
            </div>
          </div>
        </FormCardBody>
      </FormCard>
    </form>
  );
};

export default IntegrationAttributeSyncCard;
