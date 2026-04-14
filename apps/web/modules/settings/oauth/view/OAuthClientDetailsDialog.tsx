"use client";

import { isLegacyClient, ORG_SCOPES, TEAM_SCOPES } from "@calcom/features/oauth/constants";
import { useLocale } from "@calcom/i18n/useLocale";
import type { AccessScope } from "@calcom/prisma/enums";
import { Alert, AlertDescription } from "@coss/ui/components/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@coss/ui/components/alert-dialog";
import { Badge } from "@coss/ui/components/badge";
import { Button } from "@coss/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@coss/ui/components/dialog";
import { Label } from "@coss/ui/components/label";
import { Textarea } from "@coss/ui/components/textarea";
import { toastManager } from "@coss/ui/components/toast";
import { CheckIcon, TriangleAlertIcon, XIcon } from "@coss/ui/icons";
import { CopyableField } from "@coss/ui/shared/copyable-field";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { OAuthClientCreateFormValues } from "../create/OAuthClientCreateModal";
import { ClientSecretsSection } from "./ClientSecretsSection";
import { OAuthClientFormFields } from "./OAuthClientFormFields";

type OAuthClientDetails = {
  clientId: string;
  name: string;
  purpose?: string | null;
  redirectUris?: string[];
  websiteUrl?: string | null;
  logo?: string | null;
  status?: string;
  rejectionReason?: string | null;
  clientSecret?: string;
  isPkceEnabled?: boolean;
  clientType?: string;
  scopes?: AccessScope[];
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
  isStatusChangePending,
  isUpdatePending,
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
    redirectUris: string[];
    websiteUrl: string;
    logo: string;
    scopes: AccessScope[] | undefined;
  }) => void;
  isStatusChangePending?: boolean;
  isUpdatePending?: boolean;
}) => {
  const { t } = useLocale();

  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionReasonError, setShowRejectionReasonError] = useState(false);

  const isLegacy = isLegacyClient(client?.scopes ?? []);
  const formClientScopes = client?.scopes ?? [];

  const form = useForm<OAuthClientCreateFormValues>({
    defaultValues: {
      name: "",
      purpose: "",
      redirectUris: [""],
      websiteUrl: "",
      logo: "",
      enablePkce: false,
      scopes: [],
    },
  });

  const handleOpenChangeComplete = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsRejectConfirmOpen(false);
      setRejectionReason("");
      setShowRejectionReasonError(false);
      form.reset();
    }
  };

  useEffect(() => {
    if (!open) return;

    if (!client) return;

    const enablePkce =
      client.isPkceEnabled ?? (client.clientType ? client.clientType.toUpperCase() === "PUBLIC" : false);

    form.reset({
      name: client.name ?? "",
      purpose: client.purpose ?? "",
      redirectUris: client.redirectUris?.length ? client.redirectUris : [""],
      websiteUrl: client.websiteUrl ?? "",
      logo: client.logo ?? "",
      enablePkce,
      scopes: client.scopes ?? [],
    });
  }, [client, open, form]);

  const status = client?.status;

  const showAdminActions = Boolean(onApprove) || Boolean(onReject);
  const isFormDisabled = showAdminActions;
  const canEdit = Boolean(onUpdate) && !isFormDisabled;
  const isConfidentialClient = client?.clientType === "CONFIDENTIAL";
  const showSecretsSection = canEdit && isConfidentialClient;

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
  const canReject = Boolean(onReject) && (status === "PENDING" || status === "APPROVED");
  const canApprove = Boolean(onApprove) && (status === "PENDING" || status === "REJECTED");

  return (
    <>
      <Dialog
        open={open && !!client}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={handleOpenChangeComplete}>
        <DialogPopup className="max-w-xl">
          {client ? (
            <form
              className="contents"
              data-testid="oauth-client-details-form"
              noValidate
              onSubmit={form.handleSubmit((values) => {
                if (!canEdit) return;
                const redirectUris = values.redirectUris.map((uri) => uri.trim()).filter(Boolean);
                if (redirectUris.length === 0) {
                  toastManager.add({ title: t("at_least_one_redirect_uri_required"), type: "error" });
                  return;
                }
                if (!isLegacy && !values.scopes?.length) {
                  toastManager.add({ title: t("oauth_client_scope_required"), type: "error" });
                  return;
                }
                onUpdate?.({
                  clientId: client.clientId,
                  name: values.name.trim() || "",
                  purpose: values.purpose.trim() || "",
                  redirectUris,
                  websiteUrl: values.websiteUrl.trim() || "",
                  logo: values.logo,
                  scopes: isLegacy && !values.scopes?.length ? undefined : values.scopes,
                });
              })}>
              <DialogHeader>
                <DialogTitle>{t("oauth_client")}</DialogTitle>
                <DialogDescription>{t("oAuth_client_updation_form_description")}</DialogDescription>
              </DialogHeader>
              <DialogPanel className="grid gap-6">
                {status ? (
                  <Badge
                    className="w-fit"
                    data-testid="oauth-client-details-status-badge"
                    variant={getStatusBadgeVariant(status).variant}>
                    {t(getStatusBadgeVariant(status).labelKey)}
                  </Badge>
                ) : null}

                {status === "PENDING" && !showAdminActions ? (
                  <Alert variant="warning">
                    <TriangleAlertIcon />
                    <AlertDescription>{t("oauth_client_pending_info_description")}</AlertDescription>
                  </Alert>
                ) : null}

                {status === "APPROVED" && !showAdminActions ? (
                  <Alert variant="warning">
                    <TriangleAlertIcon />
                    <AlertDescription>{t("oauth_client_approved_reapproval_info")}</AlertDescription>
                  </Alert>
                ) : null}

                {status === "REJECTED" && client.rejectionReason ? (
                  <Alert variant="error">
                    <TriangleAlertIcon />
                    <AlertDescription>
                      <div data-testid="oauth-client-details-rejection-reason-display">
                        <p className="mb-2">&quot;{client.rejectionReason}&quot;.</p>
                        <p>{t("oauth_client_rejected_resubmit_info")}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : null}

                {showAdminActions && hasTeamOrOrgScopes(formClientScopes) ? (
                  <Alert variant="warning" data-testid="oauth-client-team-org-scopes-warning">
                    <TriangleAlertIcon />
                    <AlertDescription>{t("oauth_client_team_org_scopes_warning")}</AlertDescription>
                  </Alert>
                ) : null}

                <CopyableField
                  copyTooltip={t("copy_to_clipboard")}
                  copiedTooltip={t("client_id_copied")}
                  data-testid="oauth-client-details-client-id"
                  label={t("client_id")}
                  value={client.clientId}
                  monospace
                />

                {showSecretsSection && clientId ? <ClientSecretsSection clientId={clientId} /> : null}

                {client.user?.email ? (
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">{t("owner")}</div>
                    <div className="text-sm text-foreground" data-testid="oauth-client-details-user-email">
                      {client.user.email}
                    </div>
                  </div>
                ) : null}

                <OAuthClientFormFields
                  form={form}
                  isClientReadOnly={isFormDisabled}
                  isPkceLocked
                  isLegacyOAuthClient={isLegacy}
                />
              </DialogPanel>
              <DialogFooter>
                <div className="flex gap-2 justify-end items-center w-full">
                  <DialogClose render={<Button variant="ghost" />} data-testid="oauth-client-details-close">
                    {t("close")}
                  </DialogClose>
                  {canReject ? (
                    <AlertDialog
                      open={isRejectConfirmOpen}
                      onOpenChange={(nextOpen) => {
                        setIsRejectConfirmOpen(nextOpen);
                        if (nextOpen) {
                          setRejectionReason("");
                          setShowRejectionReasonError(false);
                        }
                      }}>
                      <AlertDialogTrigger
                        render={
                          <Button
                            type="button"
                            variant="destructive"
                            data-testid="oauth-client-details-reject-trigger"
                            loading={isStatusChangePending}
                          />
                        }>
                        <XIcon aria-hidden />
                        {t("reject")}
                      </AlertDialogTrigger>
                      <AlertDialogPopup>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("reject_oauth_client")}</AlertDialogTitle>
                          <AlertDialogDescription>{t("reason_for_rejection")}</AlertDialogDescription>
                          <div className="mt-2 space-y-2">
                            <Label htmlFor="oauth-rejection-reason" className="sr-only">
                              {t("reason_for_rejection")}
                            </Label>
                            <Textarea
                              id="oauth-rejection-reason"
                              data-testid="oauth-client-details-rejection-reason"
                              value={rejectionReason}
                              onChange={(e) => {
                                setRejectionReason(e.target.value);
                                if (showRejectionReasonError && e.target.value.trim().length > 0) {
                                  setShowRejectionReasonError(false);
                                }
                              }}
                              className={showRejectionReasonError ? "border-destructive" : undefined}
                            />
                            {showRejectionReasonError ? (
                              <span className="text-destructive text-sm block">{t("is_required")}</span>
                            ) : null}
                          </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogClose render={<Button variant="ghost" />}>
                            {t("cancel")}
                          </AlertDialogClose>
                          <Button
                            type="button"
                            variant="destructive"
                            data-testid="oauth-client-details-reject-confirm"
                            loading={isStatusChangePending}
                            onClick={handleConfirmReject}>
                            <XIcon aria-hidden />
                            {t("reject")}
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogPopup>
                    </AlertDialog>
                  ) : null}
                  {canApprove ? (
                    <Button
                      type="button"
                      variant="default"
                      data-testid="oauth-client-details-approve-trigger"
                      loading={isStatusChangePending}
                      onClick={() => {
                        if (!clientId) return;
                        onApprove?.(clientId);
                      }}>
                      <CheckIcon aria-hidden />
                      {t("approve")}
                    </Button>
                  ) : null}
                  {canEdit ? (
                    <Button type="submit" loading={isUpdatePending} data-testid="oauth-client-details-save">
                      {t("save")}
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </form>
          ) : null}
        </DialogPopup>
      </Dialog>
    </>
  );
};

function hasTeamOrOrgScopes(scopes: AccessScope[]): boolean {
  const teamOrOrgSet = new Set<string>([...TEAM_SCOPES, ...ORG_SCOPES]);
  return scopes.some((s) => teamOrOrgSet.has(s));
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "APPROVED":
      return { variant: "success" as const, labelKey: "approved" as const };
    case "REJECTED":
      return { variant: "error" as const, labelKey: "rejected" as const };
    case "PENDING":
    default:
      return { variant: "warning" as const, labelKey: "pending" as const };
  }
}

export type { OAuthClientDetails };
export { OAuthClientDetailsDialog };
