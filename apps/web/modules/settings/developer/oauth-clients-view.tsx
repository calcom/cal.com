"use client";

import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
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

import { OAuthClientsSkeleton } from "./oauth-clients-skeleton";

type SubmitClientMutationResult = {
  clientId: string;
  name: string;
  purpose: string;
  isPkceEnabled?: boolean;
  clientSecret?: string;
  redirectUri?: string;
  logo?: string | null;
  approvalStatus?: string;
};

const OAuthClientsView = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showDialog, setShowDialog] = useState(false);
  const [submittedClient, setSubmittedClient] = useState<OAuthClientDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<OAuthClientDetails | null>(null);

  const { data: oAuthClients, isLoading } = trpc.viewer.oAuth.listUserClients.useQuery();

  const submitMutation = trpc.viewer.oAuth.submitClient.useMutation({
    onSuccess: async (data: SubmitClientMutationResult) => {
      setSubmittedClient({
        clientId: data.clientId,
        name: data.name,
        purpose: data.purpose,
        clientSecret: data.clientSecret,
        approvalStatus: data.approvalStatus ?? "PENDING",
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
          approvalStatus: data.approvalStatus,
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
    submitMutation.mutate({
      name: values.name,
      purpose: values.purpose,
      redirectUri: values.redirectUri,
      websiteUrl: values.websiteUrl,
      logo: values.logo,
      enablePkce: values.enablePkce,
    });
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSubmittedClient(null);
  };

  const handleCloseClientDialog = () => {
    setSelectedClient(null);
  };

  if (isLoading) {
    return <OAuthClientsSkeleton />;
  }

  const NewOAuthClientButton = () => (
    <Button
      color="secondary"
      StartIcon="plus"
      size="sm"
      variant="fab"
      onClick={() => setShowDialog(true)}>
      {t("new")}
    </Button>
  );

  return (
    <SettingsHeader
      title={t("oauth_clients")}
      description={t("oauth_clients_description")}
      CTA={<NewOAuthClientButton />}>
      {oAuthClients && oAuthClients.length > 0 ? (
        <OAuthClientsList
          clients={oAuthClients.map((client) => ({
            clientId: client.clientId,
            name: client.name,
            purpose: client.purpose,
            redirectUri: client.redirectUri,
            websiteUrl: client.websiteUrl,
            logo: client.logo,
            approvalStatus: client.approvalStatus,
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
          buttonRaw={
            <NewOAuthClientButton />
          }
        />
      )}

      <OAuthClientCreateDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={t("create_oauth_client")}
        submitLabel={t("create")}
        isSubmitting={submitMutation.isPending}
        onSubmit={handleSubmit}
        resultClient={submittedClient}
        resultTitle={t("oauth_client_submitted")}
        resultDescription={t("oauth_client_submitted_description")}
        onClose={handleCloseDialog}
      />

      <OAuthClientDetailsDialog
        open={Boolean(selectedClient)}
        onOpenChange={(open) => !open && handleCloseClientDialog()}
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
