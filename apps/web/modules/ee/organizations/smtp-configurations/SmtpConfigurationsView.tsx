"use client";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Switch } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";

import LicenseRequired from "~/ee/common/components/LicenseRequired";
import AddSmtpConfigurationDialog from "./AddSmtpConfigurationDialog";

interface SmtpConfiguration {
  id: number;
  organizationId: number;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  isEnabled: boolean;
  isPrimary: boolean;
  lastTestedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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

const SmtpConfigurationCard = ({
  config,
  canEdit,
  onSetPrimary,
  onDelete,
  onToggleEnabled,
}: {
  config: SmtpConfiguration;
  canEdit: boolean;
  onSetPrimary: (id: number) => void;
  onDelete: (config: SmtpConfiguration) => void;
  onToggleEnabled: (id: number, isEnabled: boolean) => void;
}) => {
  const { t } = useLocale();

  return (
    <div className="bg-default border-subtle flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-emphasis font-medium">{config.fromEmail}</span>
          {config.isPrimary && <Badge variant="blue">{t("primary")}</Badge>}
          {!config.isEnabled && <Badge variant="gray">{t("disabled")}</Badge>}
        </div>
        {config.fromName && <p className="text-subtle text-sm">{config.fromName}</p>}
        <p className="text-subtle text-xs">
          {config.smtpHost}:{config.smtpPort} ({config.smtpSecure ? "SSL/TLS" : "STARTTLS"})
        </p>
        {config.lastError && <p className="text-error text-xs">{config.lastError}</p>}
      </div>
      {canEdit && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-subtle text-sm">{t("enabled")}</span>
            <Switch
              checked={config.isEnabled}
              onCheckedChange={(checked) => onToggleEnabled(config.id, checked)}
            />
          </div>
          <div className="flex gap-2">
            {!config.isPrimary && config.isEnabled && (
              <Button color="secondary" size="sm" onClick={() => onSetPrimary(config.id)}>
                {t("set_as_primary")}
              </Button>
            )}
            <Button color="destructive" size="sm" onClick={() => onDelete(config)}>
              {t("delete")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const SmtpConfigurationsView = ({ permissions }: { permissions: { canRead: boolean; canEdit: boolean } }) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState<SmtpConfiguration | null>(null);

  const { data: configs, isPending } = trpc.viewer.organizations.listSmtpConfigurations.useQuery();

  const setAsPrimaryMutation = trpc.viewer.organizations.setSmtpConfigurationAsPrimary.useMutation({
    onSuccess: () => {
      showToast(t("smtp_configuration_set_as_primary"), "success");
      utils.viewer.organizations.listSmtpConfigurations.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.organizations.deleteSmtpConfiguration.useMutation({
    onSuccess: () => {
      showToast(t("smtp_configuration_deleted"), "success");
      utils.viewer.organizations.listSmtpConfigurations.invalidate();
      setDeleteConfig(null);
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const toggleMutation = trpc.viewer.organizations.toggleSmtpConfiguration.useMutation({
    onSuccess: (data) => {
      showToast(
        data.isEnabled ? t("smtp_configuration_enabled") : t("smtp_configuration_disabled"),
        "success"
      );
      utils.viewer.organizations.listSmtpConfigurations.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleSetPrimary = (id: number) => {
    setAsPrimaryMutation.mutate({ id });
  };

  const handleDelete = (config: SmtpConfiguration) => {
    setDeleteConfig(config);
  };

  const handleToggleEnabled = (id: number, isEnabled: boolean) => {
    toggleMutation.mutate({ id, isEnabled });
  };

  if (isPending) return <SkeletonLoader />;

  return (
    <LicenseRequired>
      <div className="space-y-6">
        {configs && configs.length > 0 ? (
          <>
            {permissions.canEdit && (
              <div className="flex justify-end">
                <Button color="primary" onClick={() => setShowAddDialog(true)}>
                  {t("add_smtp_configuration")}
                </Button>
              </div>
            )}
            <div className="space-y-4">
              {configs.map((config) => (
                <SmtpConfigurationCard
                  key={config.id}
                  config={config as SmtpConfiguration}
                  canEdit={permissions.canEdit}
                  onSetPrimary={handleSetPrimary}
                  onDelete={handleDelete}
                  onToggleEnabled={handleToggleEnabled}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyScreen
            Icon="mail"
            headline={t("no_smtp_configurations")}
            description={t("add_smtp_configuration_to_get_started")}
            className="rounded-b-lg"
            buttonRaw={
              permissions.canEdit ? (
                <Button color="primary" onClick={() => setShowAddDialog(true)}>
                  {t("add_smtp_configuration")}
                </Button>
              ) : undefined
            }
            border={true}
          />
        )}

        <AddSmtpConfigurationDialog open={showAddDialog} onOpenChange={setShowAddDialog} />

        {deleteConfig && (
          <Dialog open={!!deleteConfig} onOpenChange={(open) => !open && setDeleteConfig(null)}>
            <ConfirmationDialogContent
              isPending={deleteMutation.isPending}
              variety="danger"
              title={t("delete_smtp_configuration")}
              confirmBtnText={t("confirm_delete_smtp_configuration")}
              loadingText={t("deleting")}
              onConfirm={() => {
                deleteMutation.mutate({ id: deleteConfig.id });
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
