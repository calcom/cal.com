"use client";

import { useState } from "react";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { FormCard, FormCardBody } from "@calcom/ui/components/card";
import { SelectField } from "@calcom/ui/components/form";

const Page = () => {
  const [showNewSync, setShowNewSync] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<{ value: string; label: string } | null>(null);

  // Fetch enabled app credentials
  const { data: credentialsData, isLoading: isLoadingCredentials } =
    trpc.viewer.attributeSync.getEnabledAppCredentials.useQuery({});

  // Fetch all attribute syncs
  const { data: attributeSyncs, isLoading: isLoadingSyncs } =
    trpc.viewer.attributeSync.getAllAttributeSyncs.useQuery();

  // Transform credentials data for SelectField
  const credentialOptions =
    credentialsData?.map((cred) => ({
      value: String(cred.id),
      label: `${cred.app?.name || cred.type} ${cred.teamId ? "(Team)" : "(Organization)"}`,
    })) ?? [];

  const handleAddNewSync = () => {
    setShowNewSync(true);
  };

  const handleCancel = () => {
    setShowNewSync(false);
    setSelectedScope("organization");
    setSelectedCredential(null);
  };

  return (
    <>
      <SettingsHeader
        title="Attribute Sync"
        description="Setup attribute syncing with 3rd party integrations">
        <Button onClick={handleAddNewSync}>Add new sync</Button>
      </SettingsHeader>

      {/* Existing Syncs */}
      {!isLoadingSyncs && attributeSyncs && attributeSyncs.length > 0 && (
        <div className="mb-4 space-y-2">
          {attributeSyncs.map((sync) => (
            <FormCard key={sync.id} label={`${sync.integration} Sync`} leftIcon="link">
              <FormCardBody>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      Status:{" "}
                      <span className={sync.enabled ? "text-green-600" : "text-gray-500"}>
                        {sync.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </span>
                    <span className="text-subtle text-xs">
                      {sync.attributeSyncRules.length} rule(s) configured
                    </span>
                  </div>
                </div>
              </FormCardBody>
            </FormCard>
          ))}
        </div>
      )}

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
                  isLoading={isLoadingCredentials}
                />
                <p className="text-subtle mt-1 text-xs">
                  Choose which integration credential to use for syncing attributes
                </p>
              </div>

              <div className="border-subtle flex justify-end gap-2 border-t pt-4">
                <Button color="minimal" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button disabled={!selectedCredential}>Continue</Button>
              </div>
            </div>
          </FormCardBody>
        </FormCard>
      )}
    </>
  );
};

export default Page;
