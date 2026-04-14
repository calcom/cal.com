"use client";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/i18n/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { TextField } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@coss/ui/components/collapsible";
import { useState } from "react";
import LicenseRequired from "~/ee/common/components/LicenseRequired";
import type { SmtpConfiguration } from "./smtp-configuration-dialog";
import SmtpConfigurationDialog from "./smtp-configuration-dialog";

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="mb-8 mt-6 space-y-6">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

const DetailField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-subtle font-semibold text-xs">{label}</span>
    <span className="text-emphasis text-sm">{value}</span>
  </div>
);

const SmtpConfigurationItem = ({
  config,
  canEdit,
  onDelete,
  onEdit,
  onSendTestEmail,
  isSendingTestEmail,
}: {
  config: SmtpConfiguration;
  canEdit: boolean;
  onDelete: (config: SmtpConfiguration) => void;
  onEdit: (config: SmtpConfiguration) => void;
  onSendTestEmail: (toEmail: string) => void;
  isSendingTestEmail: boolean;
}) => {
  const { t } = useLocale();
  const [testEmail, setTestEmail] = useState("");

  return (
    <Collapsible className="bg-default border-subtle overflow-hidden rounded-xl border">
      <div className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <CollapsibleTrigger className="flex min-w-0 flex-1 flex-col text-left">
          <span className="text-emphasis truncate text-base font-medium">{config.fromName || config.fromEmail}</span>
          <span className="text-subtle truncate text-sm">{config.fromEmail}</span>
        </CollapsibleTrigger>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <>
              <Button
                type="button"
                variant="button"
                color="secondary"
                size="sm"
                onClick={() => onEdit(config)}>
                {t("edit")}
              </Button>
              <Dropdown>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="icon"
                    color="secondary"
                    size="sm"
                    className="p-3!"
                    StartIcon="ellipsis"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem className="cursor-pointer">
                    <DropdownItem
                      type="button"
                      color="destructive"
                      onClick={() => onDelete(config)}
                      StartIcon="trash">
                      {t("delete")}
                    </DropdownItem>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </Dropdown>
            </>
          )}
        </div>
      </div>
      <CollapsiblePanel>
        <div className="border-subtle space-y-4 border-t py-4 px-5">
          <DetailField label={t("sending_email_address")} value={config.fromEmail} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailField label={t("smtp_host")} value={config.smtpHost} />
            <DetailField label={t("smtp_port")} value={String(config.smtpPort)} />
          </div>

          <DetailField
            label={t("smtp_encryption")}
            value={config.smtpSecure ? t("connection_ssl_tls") : t("connection_starttls")}
          />
        </div>

        <div className="border-subtle flex items-center gap-3 border-t py-4 px-5">
          <TextField
            type="email"
            containerClassName="mb-0"
            placeholder="test@mail.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            type="button"
            color="secondary"
            size="sm"
            loading={isSendingTestEmail}
            disabled={!testEmail}
            onClick={(e) => {
              e.stopPropagation();
              onSendTestEmail(testEmail);
            }}>
            {t("send_a_test")}
          </Button>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
};

const SmtpConfigurationsView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editConfig, setEditConfig] = useState<SmtpConfiguration | null>(null);
  const [deleteConfig, setDeleteConfig] = useState<SmtpConfiguration | null>(null);

  const { data: config, isPending } = trpc.viewer.organizations.getSmtpConfiguration.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const deleteMutation = trpc.viewer.organizations.deleteSmtpConfiguration.useMutation({
    onSuccess: () => {
      showToast(t("smtp_configuration_deleted"), "success");
      utils.viewer.organizations.getSmtpConfiguration.invalidate();
      setDeleteConfig(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const sendTestEmailMutation = trpc.viewer.organizations.sendSmtpTestEmail.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        showToast(t("smtp_test_email_sent"), "success");
      } else {
        showToast(data.error || t("smtp_test_email_failed"), "error");
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleDelete = (config: SmtpConfiguration) => {
    setDeleteConfig(config);
  };

  const handleEdit = (config: SmtpConfiguration) => {
    setEditConfig(config);
  };

  const handleSendTestEmail = (toEmail: string) => {
    sendTestEmailMutation.mutate({ toEmail });
  };

  if (isPending) return <SkeletonLoader />;

  return (
    <LicenseRequired>
      <div className="space-y-6">
        {config ? (
          <SmtpConfigurationItem
            config={config}
            canEdit={permissions.canEdit}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onSendTestEmail={handleSendTestEmail}
            isSendingTestEmail={sendTestEmailMutation.isPending}
          />
        ) : (
          <div className="border-subtle flex items-center justify-between rounded-xl border px-6 py-5">
            <div className="flex flex-col gap-1">
              <h3 className="text-emphasis text-base font-semibold">{t("smtp_empty_state_title")}</h3>
              <p className="text-subtle text-sm">{t("smtp_empty_state_subtitle")}</p>
            </div>
            {permissions.canEdit && (
              <Button color="secondary" className="shrink-0" onClick={() => setShowAddDialog(true)}>
                {t("smtp_connect")}
              </Button>
            )}
          </div>
        )}

        <SmtpConfigurationDialog
          key={editConfig ? `edit-${editConfig.id}` : "create"}
          open={showAddDialog || !!editConfig}
          onOpenChange={(open) => {
            if (!open) {
              setShowAddDialog(false);
              setEditConfig(null);
            }
          }}
          config={editConfig || undefined}
        />

        {deleteConfig && (
          <Dialog open={!!deleteConfig} onOpenChange={(open) => !open && setDeleteConfig(null)}>
            <ConfirmationDialogContent
              isPending={deleteMutation.isPending}
              variety="danger"
              title={t("delete_smtp_configuration")}
              confirmBtnText={t("confirm_delete_smtp_configuration")}
              loadingText={t("deleting")}
              onConfirm={() => {
                deleteMutation.mutate();
              }}>
              {t("delete_smtp_configuration_description", { email: deleteConfig.fromEmail })}
            </ConfirmationDialogContent>
          </Dialog>
        )}
      </div>
    </LicenseRequired>
  );
};

export default SmtpConfigurationsView;
