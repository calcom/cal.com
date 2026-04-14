"use client";

import { useState } from "react";

import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@coss/ui/components/empty";
import { KeyIcon } from "@coss/ui/icons";

import { OAuthClientsAdminSkeleton } from "./oauth-clients-admin-skeleton";
import { PaginationControls } from "./oauth/components/pagination-controls";
import { StatusFilter } from "./oauth/components/status-filter";
import { useClientListState } from "./oauth/hooks/use-client-list-state";
import { usePagination } from "./oauth/hooks/use-pagination";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import { toastManager } from "@coss/ui/components/toast";

import type { OAuthClientCreateFormValues } from "../oauth/create/OAuthClientCreateModal";
import { OAuthClientCreateDialog } from "../oauth/create/OAuthClientCreateModal";
import { OAuthClientPreviewDialog } from "../oauth/create/OAuthClientPreviewDialog";
import { OAuthClientDetailsDialog, type OAuthClientDetails } from "../oauth/view/OAuthClientDetailsDialog";
import { OAuthClientsList } from "../oauth/OAuthClientsList";

const PAGE_SIZE = 25;

export default function OAuthClientsAdminView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const { statusFilter, page, setStatus, setPage } = useClientListState();
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [createdClient, setCreatedClient] = useState<OAuthClientDetails | null>(null);
  const [selectedClient, setSelectedClient] = useState<OAuthClientDetails | null>(null);

  const { data: totalCount } = trpc.viewer.oAuth.countClients.useQuery({ status: statusFilter });

  const { totalPages, startItem, endItem } = usePagination({
    totalCount,
    pageSize: PAGE_SIZE,
    page,
    onClamp: setPage,
  });

  const { data: clients, isLoading: isClientsLoading } = trpc.viewer.oAuth.listClients.useQuery({
    status: statusFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  const createMutation = trpc.viewer.oAuth.createClient.useMutation({
    onSuccess: async (data) => {
      setCreatedClient({
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        name: data.name,
        purpose: data.purpose ?? "",
        status: data.status,
        redirectUris: data.redirectUris,
        logo: data.logo || null,
      });
      toastManager.add({ title: t("oauth_client_created"), type: "success" });
      utils.viewer.oAuth.listClients.invalidate();
      utils.viewer.oAuth.countClients.invalidate();
    },
    onError: (error) => {
      toastManager.add({ title: `${t("oauth_client_create_error")}: ${error.message}`, type: "error" });
    },
  });

  const updateStatusMutation = trpc.viewer.oAuth.updateClient.useMutation({
    onSuccess: async (data) => {
      toastManager.add({
        title: t("oauth_client_status_updated", { name: data.name, status: data.status }),
        type: "success",
      });

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
      utils.viewer.oAuth.countClients.invalidate();
    },
    onError: (error) => {
      toastManager.add({ title: `${t("oauth_client_status_update_error")}: ${error.message}`, type: "error" });
    },
  });

  const handleCreateClient = (values: OAuthClientCreateFormValues) => {
    createMutation.mutate({
      name: values.name,
      purpose: values.purpose,
      redirectUris: values.redirectUris,
      websiteUrl: values.websiteUrl,
      logo: values.logo,
      enablePkce: values.enablePkce,
      scopes: values.scopes,
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

  return (
    <SettingsHeader
      title={t("oauth_clients_admin")}
      description={t("oauth_clients_admin_description")}
      borderInShellHeader={false}>
      {isClientsLoading ? (
        <div className="mt-8">
          <OAuthClientsAdminSkeleton />
        </div>
      ) : (
      <div className="mt-8 space-y-6">
        <StatusFilter statusFilter={statusFilter} onStatusChange={setStatus} />

        {clients?.length || totalCount ? (
          <>
            <OAuthClientsList
              clients={clients ?? []}
              onSelectClient={(client) => setSelectedClient(client)}
              showStatus
            />
            <PaginationControls
              page={page}
              totalPages={totalPages}
              startItem={startItem}
              endItem={endItem}
              totalCount={totalCount ?? 0}
              onPageChange={setPage}
            />
          </>
        ) : (
          <Empty className="rounded-xl border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <KeyIcon />
              </EmptyMedia>
              <EmptyTitle>{t("no_oauth_clients")}</EmptyTitle>
              <EmptyDescription>{t("no_oauth_clients_matching_filter")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
      )}

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
        key={selectedClient?.clientId}
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
