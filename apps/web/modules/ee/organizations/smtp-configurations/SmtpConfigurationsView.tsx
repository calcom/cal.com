"use client";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent } from "@calcom/ui/components/dialog";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { showToast } from "@calcom/ui/components/toast";
import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from "@coss/ui/components/collapsible";
import { ChevronDownIcon, MailIcon } from "lucide-react";
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

const SmtpConfigurationItem = ({
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
    <Collapsible className="bg-default border-subtle border-b last:border-b-0">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-5 text-left">
        <div className="flex items-center gap-3">
          <div className="bg-subtle flex h-10 w-10 items-center justify-center rounded-full">
            <MailIcon className="text-default h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-emphasis text-base font-medium">{config.fromEmail}</span>
              {config.isPrimary && <Badge variant="blue">{t("primary")}</Badge>}
              {!config.isEnabled && <Badge variant="gray">{t("disabled")}</Badge>}
            </div>
            <span className="text-subtle text-sm">
              {config.fromName ? `${config.fromName} · ` : ""}
              {config.smtpHost}:{config.smtpPort}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Dropdown>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="icon"
                  color="secondary"
                  StartIcon="ellipsis"
                  onClick={(e) => e.stopPropagation()}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {!config.isPrimary && config.isEnabled && (
                  <DropdownMenuItem>
                    <DropdownItem
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetPrimary(config.id);
                      }}
                      StartIcon="star">
                      {t("set_as_primary")}
                    </DropdownItem>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleEnabled(config.id, !config.isEnabled);
                    }}
                    StartIcon={config.isEnabled ? "x" : "check"}>
                    {config.isEnabled ? t("disable") : t("enable")}
                  </DropdownItem>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <DropdownItem
                    type="button"
                    color="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(config);
                    }}
                    StartIcon="trash">
                    {t("delete")}
                  </DropdownItem>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </Dropdown>
          )}
          <ChevronDownIcon className="text-subtle h-5 w-5 shrink-0 transition-transform duration-200 [[data-panel-open]_&]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsiblePanel className="px-5">
        <div className="space-y-4 pb-5">
          <div className="bg-subtle/50 rounded-lg p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-subtle text-xs font-medium uppercase tracking-wide">{t("smtp_host")}</span>
                <p className="text-emphasis mt-1 text-sm font-medium">
                  {config.smtpHost}:{config.smtpPort}
                </p>
              </div>
              <div>
                <span className="text-subtle text-xs font-medium uppercase tracking-wide">{t("connection")}</span>
                <p className="text-emphasis mt-1 text-sm font-medium">{config.smtpSecure ? "SSL/TLS" : "STARTTLS"}</p>
              </div>
            </div>
          </div>
          {config.lastError && (
            <div className="bg-error/10 text-error rounded-lg p-3 text-sm">{config.lastError}</div>
          )}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
};

const SmtpConfigurationList = ({
  configs,
  canEdit,
  onSetPrimary,
  onDelete,
  onToggleEnabled,
}: {
  configs: SmtpConfiguration[];
  canEdit: boolean;
  onSetPrimary: (id: number) => void;
  onDelete: (config: SmtpConfiguration) => void;
  onToggleEnabled: (id: number, isEnabled: boolean) => void;
}) => {
  return (
    <div className="bg-default border-subtle overflow-hidden rounded-xl border shadow-sm">
      {configs.map((config) => (
        <SmtpConfigurationItem
          key={config.id}
          config={config}
          canEdit={canEdit}
          onSetPrimary={onSetPrimary}
          onDelete={onDelete}
          onToggleEnabled={onToggleEnabled}
        />
      ))}
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
            <SmtpConfigurationList
              configs={configs as SmtpConfiguration[]}
              canEdit={permissions.canEdit}
              onSetPrimary={handleSetPrimary}
              onDelete={handleDelete}
              onToggleEnabled={handleToggleEnabled}
            />
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
