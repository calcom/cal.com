"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import type { OAuthClientCreateFormValues } from "../oauth/create/OAuthClientCreateModal";
import { OAuthClientCreateDialog } from "../oauth/create/OAuthClientCreateModal";
import { OAuthClientPreviewDialog } from "../oauth/create/OAuthClientPreviewDialog";
import { OAuthClientsList } from "../oauth/OAuthClientsList";
import { type OAuthClientDetails, OAuthClientDetailsDialog } from "../oauth/view/OAuthClientDetailsDialog";
import { OAuthClientsAdminSkeleton } from "./oauth-clients-admin-skeleton";

export default function OAuthClientsAdminView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [createdClient, setCreatedClient] = useState<OAuthClientDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<OAuthClientDetails | null>(null);

  const { data: pendingClients, isLoading: isPendingClientsLoading } = trpc.viewer.oAuth.listClients.useQuery(
    {
      status: "PENDING",
    }
  );
  const { data: rejectedClients, isLoading: isRejectedClientsLoading } =
    trpc.viewer.oAuth.listClients.useQuery({
      status: "REJECTED",
    });
  const { data: approvedClients, isLoading: isApprovedClientsLoading } =
    trpc.viewer.oAuth.listClients.useQuery({
      status: "APPROVED",
    });

  const createMutation = trpc.viewer.oAuth.createClient.useMutation({
    onSuccess: async (data) => {
      setCreatedClient({
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        name: data.name,
        purpose: data.purpose ?? "",
        status: data.status,
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

  const updateStatusMutation = trpc.viewer.oAuth.updateClient.useMutation({
    onSuccess: async (data) => {
      showToast(t("oauth_client_status_updated", { name: data.name, status: data.status }), "success");

      setSelectedClient((prev) => {
        if (!prev) return prev;
        if (prev.clientId !== data.clientId) return prev;
        return {
          ...prev,
          status: data.status,
          rejectionReason: data.rejectionReason,
        };
      });

      utils.viewer.oAuth.listClients.invalidate();
    },
    onError: (error) => {
      showToast(`${t("oauth_client_status_update_error")}: ${error.message}`, "error");
    },
  });

  const handleCreateClient = (values: OAuthClientCreateFormValues) => {
    createMutation.mutate({
      name: values.name,
      purpose: values.purpose,
      redirectUri: values.redirectUri,
      websiteUrl: values.websiteUrl,
      logo: values.logo,
      enablePkce: values.enablePkce,
    });
  };

  const handleCloseDialog = () => {
    setIsCreatingClient(false);
    setCreatedClient(null);
  };

  const handleCloseClientDialog = () => {
    setSelectedClient(null);
  };

  const handleApprove = (clientId: string) => {
    updateStatusMutation.mutate({ clientId, status: "APPROVED" });
  };

  const handleReject = (input: { clientId: string; rejectionReason: string }) => {
    updateStatusMutation.mutate({
      clientId: input.clientId,
      status: "REJECTED",
      rejectionReason: input.rejectionReason,
    });
  };

  if (isPendingClientsLoading || isRejectedClientsLoading || isApprovedClientsLoading) {
    return <OAuthClientsAdminSkeleton />;
  }

  return (
    <SettingsHeader title={t("oauth_clients_admin")} description={t("oauth_clients_admin_description")}>
      <div className="space-y-10">
        <div className="space-y-3" data-testid="oauth-client-admin-pending-section">
          <h2 className="text-emphasis text-base font-semibold">{t("pending")}</h2>
          <OAuthClientsList
            clients={pendingClients ?? []}
            onSelectClient={(client) => setSelectedClient(client)}
            showStatus
          />
        </div>

        <div className="space-y-3" data-testid="oauth-client-admin-rejected-section">
          <h2 className="text-emphasis text-base font-semibold">{t("rejected")}</h2>
          <OAuthClientsList
            clients={rejectedClients ?? []}
            onSelectClient={(client) => setSelectedClient(client)}
            showStatus
          />
        </div>

        <div className="space-y-3" data-testid="oauth-client-admin-approved-section">
          <h2 className="text-emphasis text-base font-semibold">{t("approved")}</h2>
          <OAuthClientsList
            clients={approvedClients ?? []}
            onSelectClient={(client) => setSelectedClient(client)}
            showStatus
          />
        </div>
      </div>

      {createdClient ? (
        <OAuthClientPreviewDialog
          open={isCreatingClient}
          onOpenChange={setIsCreatingClient}
          title={t("oauth_client_created")}
          description={t("oauth_client_created_description")}
          client={createdClient}
          onClose={handleCloseDialog}
        />
      ) : (
        <OAuthClientCreateDialog
          open={isCreatingClient}
          onOpenChange={setIsCreatingClient}
          isSubmitting={createMutation.isPending}
          onSubmit={handleCreateClient}
          onClose={handleCloseDialog}
        />
      )}

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
