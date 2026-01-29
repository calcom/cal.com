"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Alert } from "@calcom/ui/components/alert";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  ConfirmationDialogContent,
  DialogClose,
  DialogContent,
  DialogFooter,
} from "@calcom/ui/components/dialog";

import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { Label, TextArea } from "@calcom/ui/components/form";

import type { OAuthClientCreateFormValues } from "../create/OAuthClientCreateModal";
import { OAuthClientFormFields } from "./OAuthClientFormFields";

type OAuthClientDetails = {
  clientId: string;
  name: string;
  purpose?: string | null;
  redirectUri?: string;
  websiteUrl?: string | null;
  logo?: string | null;
  status?: string;
  rejectionReason?: string | null;
  clientSecret?: string;
  isPkceEnabled?: boolean;
  clientType?: string;
  user?: {
    email: string;
  } | null;
};

const OAuthClientDetailsDialog = ({
  open,
  onOpenChange,
  client,
  onApprove,
  onReject,
  onUpdate,
  onDelete,
  isStatusChangePending,
  isUpdatePending,
  isDeletePending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: OAuthClientDetails | null;
  onApprove?: (clientId: string) => void;
  onReject?: (input: { clientId: string; rejectionReason: string }) => void;
  onUpdate?: (input: {
    clientId: string;
    name: string;
    purpose: string;
    redirectUri: string;
    websiteUrl: string;
    logo: string;
  }) => void;
  onDelete?: (clientId: string) => void;
  isStatusChangePending?: boolean;
  isUpdatePending?: boolean;
  isDeletePending?: boolean;
}) => {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();

  const [logo, setLogo] = useState("");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionReasonError, setShowRejectionReasonError] =
    useState(false);
  const form = useForm<OAuthClientCreateFormValues>({
    defaultValues: {
      name: "",
      purpose: "",
      redirectUri: "",
      websiteUrl: "",
      logo: "",
      enablePkce: false,
    },
  });

  useEffect(() => {
    if (open) return;
    setIsDeleteConfirmOpen(false);
    setIsRejectConfirmOpen(false);
    setRejectionReason("");
    setShowRejectionReasonError(false);
  }, [open]);

  useEffect(() => {
    if (!client) return;

    const enablePkce =
      client.isPkceEnabled ??
      (client.clientType
        ? client.clientType.toUpperCase() === "PUBLIC"
        : false);
    const nextLogo = client.logo ?? "";

    setLogo(nextLogo);
    form.reset({
      name: client.name ?? "",
      purpose: client.purpose ?? "",
      redirectUri: client.redirectUri ?? "",
      websiteUrl: client.websiteUrl ?? "",
      logo: nextLogo,
      enablePkce,
    });
  }, [client, form]);

  const status = client?.status;

  const showAdminActions = Boolean(onApprove) || Boolean(onReject);
  const isFormDisabled = showAdminActions;
  const canEdit = Boolean(onUpdate) && !isFormDisabled;
  const canDelete = Boolean(onDelete) && !showAdminActions;

  const handleConfirmReject = () => {
    if (!client) return;

    const trimmedReason = rejectionReason.trim();
    if (trimmedReason.length === 0) {
      setShowRejectionReasonError(true);
      return;
    }

    onReject?.({ clientId: client.clientId, rejectionReason: trimmedReason });
    setIsRejectConfirmOpen(false);
    setRejectionReason("");
    setShowRejectionReasonError(false);
  };

  const clientId = client?.clientId;

  const footerActions = (() => {
    const closeButton = (
      <DialogClose color="minimal" data-testid="oauth-client-details-close">
        {t("close")}
      </DialogClose>
    );

    if (showAdminActions) {
      const canReject =
        Boolean(onReject) && (status === "PENDING" || status === "APPROVED");
      const canApprove =
        Boolean(onApprove) && (status === "PENDING" || status === "REJECTED");

      return (
        <div className="flex gap-2 justify-end items-center w-full">
          {closeButton}
          {canReject ? (
            <Button
              type="button"
              color="primary"
              StartIcon="x"
              data-testid="oauth-client-details-reject-trigger"
              loading={isStatusChangePending}
              onClick={() => {
                setIsRejectConfirmOpen(true);
                setRejectionReason("");
                setShowRejectionReasonError(false);
              }}
            >
              {t("reject")}
            </Button>
          ) : null}
          {canApprove ? (
            <Button
              type="button"
              color="primary"
              StartIcon="check"
              data-testid="oauth-client-details-approve-trigger"
              loading={isStatusChangePending}
              onClick={() => {
                if (!clientId) return;
                onApprove?.(clientId);
              }}
            >
              {t("approve")}
            </Button>
          ) : null}
        </div>
      );
    }

    if (canEdit) {
      return (
        <div className="flex gap-2 justify-end items-center w-full">
          {closeButton}
          <Button
            type="submit"
            loading={isUpdatePending}
            data-testid="oauth-client-details-save"
          >
            {t("save")}
          </Button>
        </div>
      );
    }

    return (
      <div className="flex justify-end items-center w-full">{closeButton}</div>
    );
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent enableOverflow type="creation">
        {client ? (
          <form
            data-testid="oauth-client-details-form"
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => {
              if (!canEdit) return;
              onUpdate?.({
                clientId: client.clientId,
                name: values.name.trim() || "",
                purpose: values.purpose.trim() || "",
                redirectUri: values.redirectUri.trim() || "",
                websiteUrl: values.websiteUrl.trim() || "",
                logo: values.logo,
              });
            })}
          >
            {status ? (
              <div className="flex justify-start items-center">
                <Badge
                  data-testid="oauth-client-details-status-badge"
                  variant={getStatusBadgeVariant(status).variant}
                >
                  {t(getStatusBadgeVariant(status).labelKey)}
                </Badge>
              </div>
            ) : null}

            {status === "PENDING" ? (
              <Alert
                severity="warning"
                title={t("oauth_client_pending_info_description")}
              />
            ) : null}

            {status === "APPROVED" ? (
              <Alert
                severity="warning"
                title={t("oauth_client_approved_reapproval_info")}
              />
            ) : null}

            {status === "REJECTED" && client.rejectionReason ? (
              <div
                className="text-sm text-subtle"
                data-testid="oauth-client-details-rejection-reason-display"
              >
                <span className="font-medium">
                  {t("oauth_client_rejection_reason")}:
                </span>{" "}
                {client.rejectionReason}
              </div>
            ) : null}

            <div>
              <div className="mb-1 text-sm text-subtle">{t("client_id")}</div>
              <div className="flex">
                <code
                  data-testid="oauth-client-details-client-id"
                  className="px-2 py-1 w-full font-mono text-sm truncate align-middle rounded-md rounded-r-none bg-subtle text-default"
                >
                  {client.clientId}
                </code>
                <Tooltip side="top" content={t("copy_to_clipboard")}>
                  <Button
                    onClick={() => {
                      copyToClipboard(client.clientId, {
                        onSuccess: () =>
                          showToast(t("client_id_copied"), "success"),
                        onFailure: () => showToast(t("error"), "error"),
                      });
                    }}
                    type="button"
                    size="sm"
                    className="rounded-l-none"
                    StartIcon="clipboard"
                  >
                    {t("copy")}
                  </Button>
                </Tooltip>
              </div>
            </div>

            {client.user?.email ? (
              <div>
                <div className="mb-1 text-sm text-subtle">{t("owner")}</div>
                <div className="text-sm text-default" data-testid="oauth-client-details-user-email">
                  {client.user.email}
                </div>
              </div>
            ) : null}

            <OAuthClientFormFields
              form={form}
              logo={logo}
              setLogo={setLogo}
              isClientReadOnly={isFormDisabled}
              isPkceLocked
            />

            {canDelete ? (
              <div className="pt-2">
                <Button
                  type="button"
                  color="destructive"
                  StartIcon="trash"
                  data-testid="oauth-client-details-delete-trigger"
                  loading={isDeletePending}
                  className="w-auto"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  {t("delete_oauth_client")}
                </Button>
                <Dialog
                  open={isDeleteConfirmOpen}
                  onOpenChange={setIsDeleteConfirmOpen}
                >
                  <ConfirmationDialogContent
                    variety="danger"
                    title={t("delete_oauth_client")}
                    cancelBtnText={t("cancel")}
                    isPending={isDeletePending}
                    confirmBtn={
                      <DialogClose
                        data-testid="oauth-client-details-delete-confirm"
                        color="primary"
                        loading={isDeletePending}
                        onClick={() => {
                          if (!client) return;
                          onDelete?.(client.clientId);
                        }}
                      >
                        {isDeletePending ? t("deleting") : t("delete")}
                      </DialogClose>
                    }
                  >
                    <p className="mb-4">{t("confirm_delete_oauth_client")}</p>
                  </ConfirmationDialogContent>
                </Dialog>
              </div>
            ) : null}

            <DialogFooter className="mt-6">{footerActions}</DialogFooter>

            <Dialog
              open={isRejectConfirmOpen}
              onOpenChange={setIsRejectConfirmOpen}
            >
              <ConfirmationDialogContent
                variety="danger"
                title={t("reject_oauth_client")}
                cancelBtnText={t("cancel")}
                confirmBtn={
                  <Button
                    type="button"
                    color="primary"
                    StartIcon="x"
                    data-testid="oauth-client-details-reject-confirm"
                    loading={isStatusChangePending}
                    className="not-disabled:hover:!bg-error not-disabled:hover:!text-white not-disabled:hover:!border-semantic-error"
                    onClick={handleConfirmReject}
                  >
                    {t("reject")}
                  </Button>
                }
              >
                <div className="mt-4 space-y-2">
                  <Label htmlFor="oauth-rejection-reason">
                    {t("reason_for_rejection")}
                  </Label>
                  <TextArea
                    id="oauth-rejection-reason"
                    data-testid="oauth-client-details-rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (
                        showRejectionReasonError &&
                        e.target.value.trim().length > 0
                      ) {
                        setShowRejectionReasonError(false);
                      }
                    }}
                    className={
                      showRejectionReasonError ? "border-error" : undefined
                    }
                  />
                  {showRejectionReasonError ? (
                    <p className="text-sm text-error">{t("is_required")}</p>
                  ) : null}
                </div>
              </ConfirmationDialogContent>
            </Dialog>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "APPROVED":
      return { variant: "success" as const, labelKey: "approved" as const };
    case "REJECTED":
      return { variant: "red" as const, labelKey: "rejected" as const };
    case "PENDING":
    default:
      return { variant: "orange" as const, labelKey: "pending" as const };
  }
}

export type { OAuthClientDetails };
export { OAuthClientDetailsDialog };
