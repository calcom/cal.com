"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";

import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
import { Label, TextArea } from "@calcom/ui/components/form";

import type { OAuthClientCreateFormValues } from "./OAuthClientCreateModal";
import { OAuthClientFormFields } from "./OAuthClientFormFields";

export type OAuthClientDetails = {
  clientId: string;
  name: string;
  purpose?: string | null;
  redirectUri?: string;
  websiteUrl?: string | null;
  logo?: string | null;
  approvalStatus?: string;
  rejectionReason?: string | null;
  clientSecret?: string;
  isPkceEnabled?: boolean;
  clientType?: string;
};

export const OAuthClientDetailsDialog = ({
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
  const [showRejectionReasonError, setShowRejectionReasonError] = useState(false);
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
      client.isPkceEnabled ?? (client.clientType ? client.clientType.toUpperCase() === "PUBLIC" : false);
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

  const approvalStatus = client?.approvalStatus;

  const showAdminActions = Boolean(onApprove) || Boolean(onReject);
  const isFormDisabled = showAdminActions;
  const canEdit = Boolean(onUpdate) && !isFormDisabled;
  const canDelete = Boolean(onDelete) && !showAdminActions;

  const showApprove = Boolean(onApprove) && (approvalStatus === "PENDING" || approvalStatus === "REJECTED");
  const showReject = Boolean(onReject) && (approvalStatus === "PENDING" || approvalStatus === "APPROVED");

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
            })}>
            {approvalStatus ? (
              <div className="flex items-center justify-start">
                <Badge variant={getStatusBadgeVariant(approvalStatus).variant}>
                  {t(getStatusBadgeVariant(approvalStatus).labelKey)}
                </Badge>
              </div>
            ) : null}

            {approvalStatus === "REJECTED" && client.rejectionReason ? (
              <div className="text-subtle text-sm" data-testid="oauth-client-details-rejection-reason-display">
                <span className="font-medium">{t("oauth_client_rejection_reason")}:</span> {client.rejectionReason}
              </div>
            ) : null}

            <div>
              <div className="text-subtle mb-1 text-sm">{t("client_id")}</div>
              <div className="flex">
                <code
                  data-testid="oauth-client-details-client-id"
                  className="bg-subtle text-default w-full truncate rounded-md rounded-r-none px-2 py-1 align-middle font-mono text-sm">
                  {client.clientId}
                </code>
                <Tooltip side="top" content={t("copy_to_clipboard")}> 
                  <Button
                    onClick={() => {
                      copyToClipboard(client.clientId, {
                        onSuccess: () => showToast(t("client_id_copied"), "success"),
                        onFailure: () => showToast(t("error"), "error"),
                      });
                    }}
                    type="button"
                    size="sm"
                    className="rounded-l-none"
                    StartIcon="clipboard">
                    {t("copy")}
                  </Button>
                </Tooltip>
              </div>
            </div>

            <OAuthClientFormFields
              form={form}
              logo={logo}
              setLogo={setLogo}
              isFormDisabled={isFormDisabled}
              isPkceLocked
              showLogoActions={!showAdminActions}
              logoFooter={
                canDelete ? (
                  <>
                    <Button
                      type="button"
                      color="destructive"
                      StartIcon="trash"
                      data-testid="oauth-client-details-delete-trigger"
                      loading={isDeletePending}
                      className="w-auto"
                      onClick={() => setIsDeleteConfirmOpen(true)}>
                      {t("delete_oauth_client")}
                    </Button>
                    <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
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
                            }}>
                            {isDeletePending ? t("deleting") : t("delete")}
                          </DialogClose>
                        }>
                        <p className="mb-4">{t("confirm_delete_oauth_client")}</p>
                      </ConfirmationDialogContent>
                    </Dialog>
                  </>
                ) : null
              }
            />

            <DialogFooter className="mt-6">
              {showAdminActions ? (
                <div className="flex w-full items-center justify-end gap-2">
                  <DialogClose color="minimal" data-testid="oauth-client-details-close">{t("close")}</DialogClose>
                  {showReject ? (
                    <Button
                      type="button"
                      color="primary"
                      StartIcon="x"
                      data-testid="oauth-client-details-reject-trigger"
                      loading={isStatusChangePending}
                      className="not-disabled:hover:!bg-error not-disabled:hover:!text-white not-disabled:hover:!border-semantic-error"
                      onClick={() => {
                        setIsRejectConfirmOpen(true);
                        setRejectionReason("");
                        setShowRejectionReasonError(false);
                      }}>
                      {t("reject")}
                    </Button>
                  ) : null}
                  {showApprove ? (
                    <Button
                      type="button"
                      color="primary"
                      StartIcon="check"
                      data-testid="oauth-client-details-approve-trigger"
                      loading={isStatusChangePending}
                      className="not-disabled:hover:!bg-cal-success not-disabled:hover:!text-white not-disabled:hover:!border-cal-success"
                      onClick={() => onApprove?.(client.clientId)}>
                      {t("approve")}
                    </Button>
                  ) : null}
                </div>
              ) : canEdit ? (
                <div className="flex w-full items-center justify-end gap-2">
                  <DialogClose color="minimal" data-testid="oauth-client-details-close">{t("close")}</DialogClose>
                  <Button type="submit" loading={isUpdatePending} data-testid="oauth-client-details-save">
                    {t("save")}
                  </Button>
                </div>
              ) : (
                <div className="flex w-full items-center justify-end">
                  <DialogClose color="minimal" data-testid="oauth-client-details-close">{t("close")}</DialogClose>
                </div>
              )}
            </DialogFooter>

            <Dialog open={isRejectConfirmOpen} onOpenChange={setIsRejectConfirmOpen}>
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
                    onClick={handleConfirmReject}>
                    {t("reject")}
                  </Button>
                }>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="oauth-rejection-reason">{t("reason_for_rejection")}</Label>
                  <TextArea
                    id="oauth-rejection-reason"
                    data-testid="oauth-client-details-rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => {
                      setRejectionReason(e.target.value);
                      if (showRejectionReasonError && e.target.value.trim().length > 0) {
                        setShowRejectionReasonError(false);
                      }
                    }}
                    className={showRejectionReasonError ? "border-error" : undefined}
                  />
                  {showRejectionReasonError ? (
                    <p className="text-error text-sm">{t("is_required")}</p>
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

function getStatusBadgeVariant (status: string) {
  switch (status) {
    case "APPROVED":
      return { variant: "success" as const, labelKey: "approved" as const };
    case "REJECTED":
      return { variant: "red" as const, labelKey: "rejected" as const };
    case "PENDING":
    default:
      return { variant: "orange" as const, labelKey: "pending" as const };
  }
};