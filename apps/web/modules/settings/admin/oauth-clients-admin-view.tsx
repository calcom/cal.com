"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";

import { OAuthClientsAdminSkeleton } from "./oauth-clients-admin-skeleton";
import { Button } from "@calcom/ui/components/button";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import {
  OAuthClientCreateDialog,
  type OAuthClientCreateFormValues,
} from "../oauth/OAuthClientCreateDialog";
import { OAuthClientDetailsDialog, type OAuthClientDetails } from "../oauth/OAuthClientDetailsDialog";
import { OAuthClientsList } from "../oauth/OAuthClientsList";

type OAuthClientRow = RouterOutputs["viewer"]["oAuth"]["listClients"][number];

export default function OAuthClientsAdminView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [createdClient, setCreatedClient] = useState<OAuthClientDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<OAuthClientDetails | null>(null);

  const { data: pendingClients, isLoading: isPendingClientsLoading } = trpc.viewer.oAuth.listClients.useQuery({
    status: "PENDING",
  });
  const { data: rejectedClients, isLoading: isRejectedClientsLoading } = trpc.viewer.oAuth.listClients.useQuery({
    status: "REJECTED",
  });
  const { data: approvedClients, isLoading: isApprovedClientsLoading } = trpc.viewer.oAuth.listClients.useQuery({
    status: "APPROVED",
  });

  const addMutation = trpc.viewer.oAuth.addClient.useMutation({
    onSuccess: async (data) => {
      setCreatedClient({
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        name: data.name,
        purpose: data.purpose,
        approvalStatus: "APPROVED",
        redirectUri: data.redirectUri,
        logo: data.logo || null,
      });
      showToast(t("oauth_client_created"), "success");
      utils.viewer.oAuth.listClients.invalidate();
    },
    onError: (error) => {
      showToast(`${t("oauth_client_create_error")}: ${error.message}`, "error");
    },
  });

  const updateStatusMutation = trpc.viewer.oAuth.updateClientStatus.useMutation({
    onSuccess: async (data) => {
      showToast(
        t("oauth_client_status_updated", { name: data.name, status: data.approvalStatus }),
        "success"
      );

      setSelectedClient((prev) => {
        if (!prev) return prev;
        if (prev.clientId !== data.clientId) return prev;
        return {
          ...prev,
          approvalStatus: data.approvalStatus,
          rejectionReason: data.rejectionReason,
        };
      });

      utils.viewer.oAuth.listClients.invalidate();
    },
    onError: (error) => {
      showToast(`${t("oauth_client_status_update_error")}: ${error.message}`, "error");
    },
  });

  const handleAddClient = (values: OAuthClientCreateFormValues) => {
    addMutation.mutate({
      name: values.name,
      purpose: values.purpose,
      redirectUri: values.redirectUri,
      websiteUrl: values.websiteUrl,
      logo: values.logo,
      enablePkce: values.enablePkce,
    });
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setCreatedClient(null);
  };

  const handleCloseClientDialog = () => {
    setSelectedClient(null);
  };

  const handleApprove = (clientId: string) => {
    updateStatusMutation.mutate({ clientId, status: "APPROVED" });
  };

  const handleReject = (input: { clientId: string; rejectionReason: string }) => {
    updateStatusMutation.mutate({ clientId: input.clientId, status: "REJECTED", rejectionReason: input.rejectionReason });
  };

  if (isPendingClientsLoading || isRejectedClientsLoading || isApprovedClientsLoading) {
    return <OAuthClientsAdminSkeleton />;
  }

  const toClientDetails = (client: OAuthClientRow): OAuthClientDetails => ({
    clientId: client.clientId,
    name: client.name,
    purpose: client.purpose,
    redirectUri: client.redirectUri,
    websiteUrl: client.websiteUrl,
    logo: client.logo,
    approvalStatus: client.approvalStatus,
    rejectionReason: client.rejectionReason,
    clientType: client.clientType,
  });

  const newOAuthClientButton = (
    <Button
      color="secondary"
      StartIcon="plus"
      size="sm"
      variant="fab"
      onClick={() => setShowAddDialog(true)}>
      {t("new")}
    </Button>
  );

  const hasClients =
    (pendingClients && pendingClients.length > 0) ||
    (rejectedClients && rejectedClients.length > 0) ||
    (approvedClients && approvedClients.length > 0);

  return (
    <SettingsHeader
      title={t("oauth_clients_admin")}
      description={t("oauth_clients_admin_description")}
      CTA={newOAuthClientButton}>
      {hasClients ? (
        <div className="space-y-10">
          <div className="space-y-3">
            <h2 className="text-emphasis text-base font-semibold">{t("pending")}</h2>
            <OAuthClientsList
              clients={(pendingClients ?? []).map(toClientDetails)}
              onSelectClient={(client) => setSelectedClient(client)}
              showStatus
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-emphasis text-base font-semibold">{t("rejected")}</h2>
            <OAuthClientsList
              clients={(rejectedClients ?? []).map(toClientDetails)}
              onSelectClient={(client) => setSelectedClient(client)}
              showStatus
            />
          </div>

          <div className="space-y-3">
            <h2 className="text-emphasis text-base font-semibold">{t("approved")}</h2>
            <OAuthClientsList
              clients={(approvedClients ?? []).map(toClientDetails)}
              onSelectClient={(client) => setSelectedClient(client)}
              showStatus
            />
          </div>
        </div>
      ) : (
        <EmptyScreen
          Icon="key"
          headline={t("no_oauth_clients")}
          description={t("no_oauth_clients_admin_description")}
          buttonRaw={newOAuthClientButton}
        />
      )}

      <OAuthClientCreateDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        title={t("create_oauth_client")}
        submitLabel={t("create")}
        isSubmitting={addMutation.isPending}
        onSubmit={handleAddClient}
        resultClient={createdClient}
        resultTitle={t("oauth_client_created")}
        resultDescription={t("oauth_client_created_description")}
        clientSecretInfoKey="copy_client_secret_info"
        onClose={handleCloseDialog}
      />

      <OAuthClientDetailsDialog
        open={Boolean(selectedClient)}
        onOpenChange={(open) => !open && handleCloseClientDialog()}
        client={selectedClient}
        onApprove={handleApprove}
        onReject={handleReject}
        isStatusChangePending={updateStatusMutation.isPending}
      />
    </SettingsHeader>
  );
}
