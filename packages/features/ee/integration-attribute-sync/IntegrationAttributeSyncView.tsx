"use client";

import { useState } from "react";

import { FieldMappingBuilder } from "@calcom/features/ee/integration-attribute-sync/components/FieldMappingBuilder";
import { RuleBuilder } from "@calcom/features/ee/integration-attribute-sync/components/RuleBuilder";
import { isAttributeCondition } from "@calcom/features/ee/integration-attribute-sync/lib/ruleHelpers";
import type { FieldMappingFormState } from "@calcom/features/ee/integration-attribute-sync/types/fieldMapping";
import type { Rule } from "@calcom/features/ee/integration-attribute-sync/types/rule";
import type { Attribute } from "@calcom/lib/service/attribute/server/getAttributes";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import { SelectField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";

import IntegrationAttributeSyncCard from "./components/IntegrationAttributeSyncCard";
import type { IntegrationAttributeSync } from "./repositories/IIntegrationAttributeSyncRepository";

interface IIntegrationAttributeSyncViewProps {
  credentialsData: {
    id: number;
    type: string;
    team: {
      name: string;
    } | null;
  }[];
  initalIntegrationAttributeSyncs: IntegrationAttributeSync[];
  organizationTeams: {
    id: number;
    name: string;
  }[];
  attributes: Attribute[];
}

const IntegrationAttributeSyncView = (props: IIntegrationAttributeSyncViewProps) => {
  const { credentialsData, initalIntegrationAttributeSyncs, organizationTeams, attributes } = props;

  // State for the new sync form
  const [showNewSync, setShowNewSync] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<{ value: string; label: string } | null>(null);
  const [ruleState, setRuleState] = useState<Rule>({
    operator: "AND",
    conditions: [],
  });
  const [fieldMappingState, setFieldMappingState] = useState<FieldMappingFormState>({
    mappings: [],
  });

  // tRPC utils for invalidation
  const utils = trpc.useUtils();

  const { data: integrationAttributeSyncs } = trpc.viewer.attributeSync.getAllAttributeSyncs.useQuery(
    undefined,
    {
      initialData: initalIntegrationAttributeSyncs,
    }
  );

  const createMutation = trpc.viewer.attributeSync.createAttributeSync.useMutation({
    onSuccess: () => {
      // Reset form
      handleCancel();
      // Invalidate to refresh list
      utils.viewer.attributeSync.getAllAttributeSyncs.invalidate();
      // Show success toast
      showToast("Attribute sync created successfully", "success");
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  // Transform credentials data for SelectField
  const credentialOptions =
    credentialsData?.map((cred) => ({
      value: String(cred.id),
      label: `${cred.type} (${cred.team?.name})`,
    })) ?? [];

  // Transform teams data for rule builder
  const teamOptions =
    organizationTeams?.map((team) => ({
      value: String(team.id),
      label: team.name,
    })) ?? [];

  const handleAddNewSync = () => {
    setShowNewSync(true);
  };

  const handleCancel = () => {
    setShowNewSync(false);
    setSelectedCredential(null);
    setRuleState({ operator: "AND", conditions: [] });
    setFieldMappingState({ mappings: [] });
  };

  const handleContinue = () => {
    if (!selectedCredential) return;

    createMutation.mutate({
      credentialId: Number(selectedCredential.value),
      rule: ruleState,
      syncFieldMappings: fieldMappingState.mappings,
      enabled: true,
    });
  };

  return (
    <>
      {/* Existing Syncs - Each has its own form */}
      {integrationAttributeSyncs && integrationAttributeSyncs.length > 0 && (
        <div className="mb-4 space-y-2">
          {integrationAttributeSyncs.map((sync) => (
            <IntegrationAttributeSyncCard
              key={sync.id}
              sync={sync}
              credentialOptions={credentialOptions}
              teamOptions={teamOptions}
              attributes={attributes}
            />
          ))}
        </div>
      )}

      {/* New Sync Form */}
      {showNewSync && (
        <FormCard
          label="New Attribute Sync"
          leftIcon="link"
          collapsible={false}
          deleteField={{
            check: () => true,
            fn: handleCancel,
          }}>
          <FormCardBody>
            <div className="space-y-4">
              <div>
                <SelectField
                  label="Credential"
                  placeholder="Select a credential..."
                  options={credentialOptions}
                  value={selectedCredential}
                  onChange={(option) => setSelectedCredential(option)}
                />
                <p className="text-subtle mt-1 text-xs">
                  Choose which integration credential to use for syncing attributes
                </p>
              </div>

              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">User Filter Rules</label>
                <RuleBuilder
                  value={ruleState}
                  onChange={setRuleState}
                  teamOptions={teamOptions}
                  attributes={attributes ?? []}
                />
                <p className="text-subtle mt-1 text-xs">
                  Define which users to sync based on team membership or attributes
                </p>
              </div>

              <div>
                <label className="text-emphasis mb-2 block text-sm font-medium">Field Mappings</label>
                <FieldMappingBuilder
                  value={fieldMappingState}
                  onChange={setFieldMappingState}
                  attributes={attributes ?? []}
                />
                <p className="text-subtle mt-1 text-xs">
                  Map integration field names to Cal.com attributes for syncing
                </p>
              </div>

              <div className="border-subtle flex justify-end gap-2 border-t pt-4">
                <Button color="minimal" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleContinue}
                  loading={createMutation.isPending}
                  disabled={
                    !selectedCredential ||
                    (ruleState.conditions.length > 0 &&
                      !ruleState.conditions.every((c) => {
                        // Check if value is filled
                        if (c.value.length === 0) return false;
                        // For attribute conditions, also check if attributeId is set
                        if (isAttributeCondition(c) && !c.attributeId) return false;
                        return true;
                      })) ||
                    (fieldMappingState.mappings.length > 0 &&
                      !fieldMappingState.mappings.every(
                        (m) => m.integrationFieldName.trim() && m.attributeId
                      ))
                  }>
                  Continue
                </Button>
              </div>
            </div>
          </FormCardBody>
        </FormCard>
      )}
      <Button StartIcon="plus" onClick={handleAddNewSync}>
        Add new sync
      </Button>
    </>
  );
};

export default IntegrationAttributeSyncView;
