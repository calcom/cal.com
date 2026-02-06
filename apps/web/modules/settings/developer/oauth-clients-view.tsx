"use client";

import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { showToast } from "@calcom/ui/components/toast";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import type { OAuthClientCreateFormValues } from "../oauth/create/OAuthClientCreateModal";
import { OAuthClientCreateDialog } from "../oauth/create/OAuthClientCreateModal";
import { OAuthClientPreviewDialog } from "../oauth/create/OAuthClientPreviewDialog";
import { OAuthClientDetailsDialog, type OAuthClientDetails } from "../oauth/view/OAuthClientDetailsDialog";
import { OAuthClientsList } from "../oauth/OAuthClientsList";
import { NewOAuthClientButton } from "../oauth/create/NewOAuthClientButton";

import { OAuthClientsSkeleton } from "./oauth-clients-skeleton";

const OAuthClientsView = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<OAuthClientDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<OAuthClientDetails | null>(null);

  const { data: oAuthClients, isLoading } = trpc.viewer.oAuth.listUserClients.useQuery();

  const submitForReviewMutation = trpc.viewer.oAuth.submitClientForReview.useMutation({
    onSuccess: async (data) => {
      setSubmittedClient({
        clientId: data.clientId,
        name: data.name,
        purpose: data.purpose ?? "",
        clientSecret: data.clientSecret,
        status: data.status,
        isPkceEnabled: data.isPkceEnabled,
      });
      showToast(t("oauth_client_submitted"), "success");
      utils.viewer.oAuth.listUserClients.invalidate();
    },
    onError: (error) => {
      showToast(`${t("oauth_client_submit_error")}: ${error.message}`, "error");
    },
  });

  const deleteClientMutation = trpc.viewer.oAuth.deleteClient.useMutation({
    onSuccess: async () => {
      showToast(t("oauth_client_deletion_message"), "success");
      setSelectedClient(null);
      utils.viewer.oAuth.listUserClients.invalidate();
    },
    onError: (error) => {
      showToast(error.message || t("error"), "error");
    },
  });

  const updateClientMutation = trpc.viewer.oAuth.updateClient.useMutation({
    onSuccess: async (data) => {
      showToast(t("oauth_client_updated_successfully"), "success");

      setSelectedClient((prev) => {
        if (!prev) return prev;
        if (prev.clientId !== data.clientId) return prev;
        return {
          ...prev,
          name: data.name,
          purpose: data.purpose,
          redirectUri: data.redirectUri,
          websiteUrl: data.websiteUrl,
          logo: data.logo,
          status: data.status,
          rejectionReason: data.rejectionReason,
        };
      });

      utils.viewer.oAuth.listUserClients.invalidate();
    },
    onError: (error) => {
      showToast(`${t("updating_oauth_client_error")}: ${error.message}`, "error");
    },
  });

  const handleSubmit = (values: OAuthClientCreateFormValues) => {
    submitForReviewMutation.mutate({
      name: values.name,
      purpose: values.purpose,
      redirectUri: values.redirectUri,
      websiteUrl: values.websiteUrl,
      logo: values.logo,
      enablePkce: values.enablePkce,
    });
  };

  const handleCloseCreateDialog = () => {
    setIsCreatingClient(false);
    setSubmittedClient(null);
  };

  const handleCloseDetailsDialog = () => {
    setSelectedClient(null);
  };

  if (isLoading) {
    return <OAuthClientsSkeleton />;
  }

  const newOAuthClientButton = (
    <NewOAuthClientButton
      dataTestId="open-oauth-client-create-dialog"
      onClick={() => setIsCreatingClient(true)}
    />
  );

  return (
    <SettingsHeader
      title={t("oauth_clients")}
      description={t("oauth_clients_description")}
      CTA={newOAuthClientButton}>
      {oAuthClients && oAuthClients.length > 0 ? (
        <OAuthClientsList
          clients={oAuthClients.map((client) => ({
            clientId: client.clientId,
            name: client.name,
            purpose: client.purpose,
            redirectUri: client.redirectUri,
            websiteUrl: client.websiteUrl,
            logo: client.logo,
            status: client.status,
            rejectionReason: client.rejectionReason,
            clientType: client.clientType,
          }))}
          onSelectClient={(client) => setSelectedClient(client)}
        />
      ) : (
        <EmptyScreen
          Icon="key"
          headline={t("no_oauth_clients")}
          description={t("no_oauth_clients_description")}
          buttonRaw={newOAuthClientButton}
        />
      )}

      {submittedClient ? (
        <OAuthClientPreviewDialog
          open={isCreatingClient}
          onOpenChange={setIsCreatingClient}
          title={t("oauth_client_submitted")}
          description={t("oauth_client_submitted_description")}
          client={submittedClient}
          onClose={handleCloseCreateDialog}
        />
      ) : (
        <OAuthClientCreateDialog
          open={isCreatingClient}
          onOpenChange={setIsCreatingClient}
          isSubmitting={submitForReviewMutation.isPending}
          onSubmit={handleSubmit}
          onClose={handleCloseCreateDialog}
        />
      )}

      <OAuthClientDetailsDialog
        open={Boolean(selectedClient)}
        onOpenChange={(open) => !open && handleCloseDetailsDialog()}
        client={selectedClient}
        onUpdate={(values) => {
          updateClientMutation.mutate({
            clientId: values.clientId,
            name: values.name,
            purpose: values.purpose,
            redirectUri: values.redirectUri,
            websiteUrl: values.websiteUrl,
            logo: values.logo,
          });
        }}
        onDelete={(clientId) => {
          deleteClientMutation.mutate({ clientId });
        }}
        isUpdatePending={updateClientMutation.isPending}
        isDeletePending={deleteClientMutation.isPending}
      />
    </SettingsHeader>
  );
};

export default OAuthClientsView;
