"use client";

import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@coss/ui/components/empty";
import { toastManager } from "@coss/ui/components/toast";
import { KeyIcon } from "@coss/ui/icons";
import {
  AppHeader,
  AppHeaderActions,
  AppHeaderContent,
  AppHeaderDescription,
} from "@coss/ui/shared/app-header";

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
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

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
      toastManager.add({ title: t("oauth_client_submitted"), type: "success" });
      utils.viewer.oAuth.listUserClients.invalidate();
    },
    onError: (error) => {
      toastManager.add({ title: `${t("oauth_client_submit_error")}: ${error.message}`, type: "error" });
    },
  });

  const deleteClientMutation = trpc.viewer.oAuth.deleteClient.useMutation({
    onSuccess: async () => {
      toastManager.add({ title: t("oauth_client_deletion_message"), type: "success" });
      setSelectedClient(null);
      setDetailsDialogOpen(false);
      utils.viewer.oAuth.listUserClients.invalidate();
    },
    onError: (error) => {
      toastManager.add({ title: error.message || t("error"), type: "error" });
    },
  });

  const updateClientMutation = trpc.viewer.oAuth.updateClient.useMutation({
    onSuccess: async (data) => {
      toastManager.add({ title: t("oauth_client_updated_successfully"), type: "success" });
      setDetailsDialogOpen(false);

      setSelectedClient((prev) => {
        if (!prev) return prev;
        if (prev.clientId !== data.clientId) return prev;
        return {
          ...prev,
          name: data.name,
          purpose: data.purpose,
          redirectUris: data.redirectUris,
          websiteUrl: data.websiteUrl,
          logo: data.logo,
          status: data.status,
          rejectionReason: data.rejectionReason,
        };
      });

      utils.viewer.oAuth.listUserClients.invalidate();
    },
    onError: (error) => {
      toastManager.add({ title: `${t("updating_oauth_client_error")}: ${error.message}`, type: "error" });
    },
  });

  const handleSubmit = (values: OAuthClientCreateFormValues) => {
    submitForReviewMutation.mutate({
      name: values.name,
      purpose: values.purpose,
      redirectUris: values.redirectUris,
      websiteUrl: values.websiteUrl,
      logo: values.logo,
      enablePkce: values.enablePkce,
      scopes: values.scopes,
    });
  };

  const handleCloseCreateDialog = () => {
    setIsCreatingClient(false);
    setSubmittedClient(null);
  };

  const handleSelectClient = (client: OAuthClientDetails) => {
    setSelectedClient(client);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
  };

  const hasClients = oAuthClients && oAuthClients.length > 0;

  return (
    <>
      <AppHeader>
        <AppHeaderContent title={t("oauth_clients")}>
          <AppHeaderDescription>{t("oauth_clients_description")}</AppHeaderDescription>
        </AppHeaderContent>
        {hasClients && (
          <AppHeaderActions>
            <NewOAuthClientButton
              dataTestId="open-oauth-client-create-dialog"
              onClick={() => setIsCreatingClient(true)}
            />
          </AppHeaderActions>
        )}
      </AppHeader>

      <div className="flex flex-col gap-6">
        {isLoading ? (
          <OAuthClientsSkeleton />
        ) : hasClients ? (
          <OAuthClientsList
            clients={oAuthClients!.map((client) => ({
              clientId: client.clientId,
              name: client.name,
              purpose: client.purpose,
              redirectUris: client.redirectUris,
              websiteUrl: client.websiteUrl,
              logo: client.logo,
              status: client.status,
              rejectionReason: client.rejectionReason,
              clientType: client.clientType,
              scopes: client.scopes,
            }))}
            onSelectClient={handleSelectClient}
          />
        ) : (
          <Empty className="rounded-xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <KeyIcon />
              </EmptyMedia>
              <EmptyTitle>{t("no_oauth_clients")}</EmptyTitle>
              <EmptyDescription>{t("no_oauth_clients_description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <NewOAuthClientButton
                dataTestId="open-oauth-client-create-dialog"
                isEmptyState
                onClick={() => setIsCreatingClient(true)}
              />
            </EmptyContent>
          </Empty>
        )}
      </div>

      <OAuthClientCreateDialog
        open={isCreatingClient && !submittedClient}
        isSubmitting={submitForReviewMutation.isPending}
        onSubmit={handleSubmit}
        onClose={handleCloseCreateDialog}
      />
      <OAuthClientPreviewDialog
        open={isCreatingClient && !!submittedClient}
        title={t("oauth_client_submitted")}
        description={t("oauth_client_submitted_description")}
        client={submittedClient}
        onClose={() => setIsCreatingClient(false)}
        onCloseComplete={() => setSubmittedClient(null)}
      />

      <OAuthClientDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={(open) => !open && handleCloseDetailsDialog()}
        client={selectedClient}
        onUpdate={(values) => {
          updateClientMutation.mutate({
            clientId: values.clientId,
            name: values.name,
            purpose: values.purpose,
            redirectUris: values.redirectUris,
            websiteUrl: values.websiteUrl,
            logo: values.logo,
            scopes: values.scopes,
          });
        }}
        onDelete={(clientId) => {
          deleteClientMutation.mutate({ clientId });
        }}
        isUpdatePending={updateClientMutation.isPending}
        isDeletePending={deleteClientMutation.isPending}
      />
    </>
  );
};

export default OAuthClientsView;
