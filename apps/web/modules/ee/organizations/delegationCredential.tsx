"use client";

import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";
import { serviceAccountKeySchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import { Badge, InfoBadge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { EmptyScreen } from "@calcom/ui/components/empty-screen";
import { Form, SelectField, Switch, TextAreaField, TextField } from "@calcom/ui/components/form";
import { SkeletonContainer, SkeletonText } from "@calcom/ui/components/skeleton";
import { DropdownActions } from "@calcom/ui/components/table";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import { Controller, useForm, useFormContext } from "react-hook-form";

interface DelegationItemProps {
  delegation: {
    id: string;
    domain: string;
    enabled: boolean;
    serviceAccountClientId: string | null;
    workspacePlatform: {
      name: string;
      slug: string;
    };
  };
  toggleDelegation: (delegation: DelegationItemProps["delegation"]) => void;
  onEdit: (delegation: DelegationItemProps["delegation"]) => void;
  onDelete: (id: string) => void;
}

type WorkspacePlatform = {
  id: number;
  name: string;
  slug: string;
};

function getWorkspacePlatformOptions(workspacePlatforms: WorkspacePlatform[]) {
  return workspacePlatforms.map((platform) => ({
    value: platform.slug,
    label: platform.name,
  }));
}

const SkeletonLoader = () => {
  return (
    <SkeletonContainer>
      <div className="divide-subtle border-subtle stack-y-6 rounded-b-lg border border-t-0 px-6 py-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    </SkeletonContainer>
  );
};

function DelegationListItemActions({
  delegation,
  toggleDelegation,
  onEdit,
  onDelete,
}: {
  delegation: DelegationItemProps["delegation"];
  toggleDelegation: DelegationItemProps["toggleDelegation"];
  onEdit: (delegation: DelegationItemProps["delegation"]) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex items-center space-x-2">
      <Switch checked={delegation.enabled} onCheckedChange={() => toggleDelegation(delegation)} />
      <DropdownActions
        actions={[
          {
            id: "edit",
            label: t("edit"),
            onClick: () => onEdit(delegation),
            icon: "pencil",
          },
          {
            id: "delete",
            label: t("delete"),
            disabled: true,
            onClick: () => onDelete(delegation.id),
            icon: "trash",
          },
        ]}
      />
    </div>
  );
}

function DelegationListItem({ delegation, toggleDelegation, onEdit, onDelete }: DelegationItemProps) {
  const { t } = useLocale();
  return (
    <li className="border-subtle bg-default divide-subtle flex flex-col divide-y border">
      <div className="flex items-center justify-between space-x-2 p-4">
        <div className="flex flex-col items-start">
          <div className="flex items-center space-x-2">
            <span>{delegation.serviceAccountClientId}</span>
            <InfoBadge content={t("add_client_id_in_google_workspace_with_below_scope")} />
          </div>
          <span className="text-muted mt-2">https://www.googleapis.com/auth/calendar</span>
          <div className="mt-2 flex items-center space-x-2">
            <Badge variant="default">{delegation.workspacePlatform.name}</Badge>
            <Badge variant="gray">{delegation.domain}</Badge>
          </div>
        </div>
        <DelegationListItemActions
          delegation={delegation}
          toggleDelegation={toggleDelegation}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}

type CreateDelegationData = {
  domain: string;
  workspacePlatformSlug: string;
  enabled: boolean;
  serviceAccountKey: ServiceAccountKey;
};

type CreateDelegationFormData = Omit<CreateDelegationData, "serviceAccountKey"> & {
  serviceAccountKey: string;
};

type EditDelegationData = {
  id: string;
  domain: string;
  workspacePlatformSlug: string;
  enabled: boolean;
};

function CreateDelegationDialog({
  isOpen,
  onClose,
  workspacePlatforms,
  handleCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspacePlatforms: WorkspacePlatform[];
  handleCreate: (data: CreateDelegationData) => void;
}) {
  const { t } = useLocale();

  const form = useForm<CreateDelegationFormData>();

  const handleSubmit = (values: CreateDelegationFormData) => {
    try {
      const parsedKey = JSON.parse(values.serviceAccountKey);
      const validatedKey = serviceAccountKeySchema.safeParse(parsedKey);

      if (!validatedKey.success) {
        form.setError("serviceAccountKey", { message: t("invalid_service_account_key") });
        return;
      }

      handleCreate({
        ...values,
        serviceAccountKey: validatedKey.data,
      });
    } catch (e) {
      console.error(e);
      form.setError("serviceAccountKey", { message: t("invalid_service_account_key") });
      return;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent enableOverflow title={t("add_delegation_credential")}>
        <Form form={form} handleSubmit={handleSubmit}>
          <DelegationFormFields workspacePlatforms={workspacePlatforms} isCreate={true} />
          <DialogFooter>
            <Button type="button" color="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("create")}</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditDelegationDialog({
  isOpen,
  onClose,
  delegation,
  workspacePlatforms,
  handleEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  delegation: DelegationItemProps["delegation"];
  workspacePlatforms: WorkspacePlatform[];
  handleEdit: (data: EditDelegationData) => void;
}) {
  const { t } = useLocale();

  const form = useForm<EditDelegationData>({
    defaultValues: {
      id: delegation.id,
      domain: delegation.domain,
      workspacePlatformSlug: delegation.workspacePlatform.slug,
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent title={t("edit_delegation_credential")}>
        <Form form={form} handleSubmit={handleEdit}>
          <DelegationFormFields workspacePlatforms={workspacePlatforms} isCreate={false} />
          <DialogFooter>
            <Button type="button" color="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{t("update")}</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DelegationFormFields({
  workspacePlatforms,
  isCreate,
}: {
  workspacePlatforms: WorkspacePlatform[];
  isCreate: boolean;
}) {
  const { t } = useLocale();
  const form = useFormContext();
  return (
    <div className="stack-y-4">
      <TextField label={t("domain")} {...form.register("domain")} />
      <Controller
        name="workspacePlatformSlug"
        control={form.control}
        render={({ field: { value, onChange } }) => {
          const platformOptions = getWorkspacePlatformOptions(workspacePlatforms);
          const selectedPlatform = platformOptions.find((opt) => opt.value === value);
          return (
            <SelectField
              required
              label={t("workspace_platform")}
              onChange={(option) => onChange(option?.value)}
              value={selectedPlatform}
              options={platformOptions}
            />
          );
        }}
      />
      {isCreate && (
        <TextAreaField
          required
          label={t("service_account_key")}
          placeholder="{...}"
          {...form.register("serviceAccountKey")}
        />
      )}
    </div>
  );
}

function DelegationCredentialList() {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: delegations, isLoading, error } = trpc.viewer.delegationCredential.list.useQuery();

  const updateMutation = trpc.viewer.delegationCredential.update.useMutation({
    onSuccess: () => utils.viewer.delegationCredential.list.invalidate(),
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const toggleEnabledMutation = trpc.viewer.delegationCredential.toggleEnabled.useMutation({
    onSuccess: (data) => {
      if (data) {
        showToast(
          data.enabled ? t("delegation_credential_enabled") : t("delegation_credential_disabled"),
          "success"
        );
        utils.viewer.delegationCredential.list.invalidate();
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const createMutation = trpc.viewer.delegationCredential.add.useMutation({
    onSuccess: () => utils.viewer.delegationCredential.list.invalidate(),
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.delegationCredential.delete.useMutation({
    onSuccess: () => utils.viewer.delegationCredential.list.invalidate(),
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const [delegationToToggle, setDelegationToToggle] = useState<DelegationItemProps["delegation"] | null>(
    null
  );

  const toggleDelegation = (delegation: DelegationItemProps["delegation"]) => {
    setDelegationToToggle(delegation);
  };

  const handleToggleConfirm = () => {
    if (delegationToToggle) {
      toggleEnabledMutation.mutate({
        id: delegationToToggle.id,
        enabled: !delegationToToggle.enabled,
      });
      setDelegationToToggle(null);
    }
  };

  const [createEditDialog, setCreateEditDialog] = useState<{
    isOpen: boolean;
    delegation: DelegationItemProps["delegation"] | null;
  }>({
    isOpen: false,
    delegation: null,
  });

  const { data: workspacePlatforms, isLoading: isLoadingWorkspacePlatforms } =
    trpc.viewer.delegationCredential.listWorkspacePlatforms.useQuery();

  const enabledWorkspacePlatforms = workspacePlatforms?.filter((platform) => platform.enabled) || [];

  const onEditClick = (delegation: DelegationItemProps["delegation"]) => {
    setCreateEditDialog({ isOpen: true, delegation });
  };

  const onCreateClick = () => setCreateEditDialog({ isOpen: true, delegation: null });

  const handleCreate = (data: CreateDelegationData) => {
    createMutation.mutate({
      domain: data.domain,
      workspacePlatformSlug: data.workspacePlatformSlug,
      serviceAccountKey: data.serviceAccountKey,
    });
    setCreateEditDialog({ isOpen: false, delegation: null });
  };

  const handleEdit = (data: EditDelegationData) => {
    if (!createEditDialog.delegation) {
      return;
    }
    updateMutation.mutate({
      id: createEditDialog.delegation.id,
      domain: data.domain,
      workspacePlatformSlug: data.workspacePlatformSlug,
    });
    setCreateEditDialog({ isOpen: false, delegation: null });
  };

  const AddDwDButton = () => {
    return (
      <Button type="button" color="secondary" StartIcon="plus" className="mt-6" onClick={onCreateClick}>
        {t("add_delegation_credential")}
      </Button>
    );
  };

  if (isLoading || isLoadingWorkspacePlatforms) {
    return <SkeletonLoader />;
  }

  if (error) {
    return <div>{t(error.message)}</div>;
  }

  if (!delegations || !workspacePlatforms) {
    return <div>{t("something_went_wrong")}</div>;
  }

  return (
    <div>
      {delegations?.length ? (
        <>
          <ul className="stack-y-2 [&>*:last-child]:rounded-b-xl">
            {delegations.map(
              (delegation) =>
                delegation && (
                  <DelegationListItem
                    key={delegation.id}
                    delegation={delegation}
                    toggleDelegation={toggleDelegation}
                    onEdit={onEditClick}
                    onDelete={onDelete}
                  />
                )
            )}
          </ul>
          {/* Disable till we thoroughly test multiple delegation credentials support */}
          {/* <AddDwDButton /> */}
        </>
      ) : (
        <EmptyScreen
          Icon="link"
          headline={t("add_delegation_credential")}
          description={t("delegation_credential_description")}
          className="rounded-b-lg rounded-t-none border-t-0"
          buttonRaw={<AddDwDButton />}
        />
      )}

      {createEditDialog.delegation ? (
        <EditDelegationDialog
          isOpen={createEditDialog.isOpen}
          onClose={() => setCreateEditDialog({ isOpen: false, delegation: null })}
          delegation={createEditDialog.delegation}
          workspacePlatforms={enabledWorkspacePlatforms}
          handleEdit={handleEdit}
        />
      ) : (
        <CreateDelegationDialog
          isOpen={createEditDialog.isOpen}
          onClose={() => setCreateEditDialog({ isOpen: false, delegation: null })}
          workspacePlatforms={enabledWorkspacePlatforms}
          handleCreate={handleCreate}
        />
      )}

      <ToggleDelegationDialog
        delegation={delegationToToggle}
        onClose={() => setDelegationToToggle(null)}
        onConfirm={handleToggleConfirm}
      />
    </div>
  );
}

function MembersThatWillBeAffectedOnDisablingDelegationCredential({
  delegationCredentialId,
}: {
  delegationCredentialId: string;
}) {
  const { t } = useLocale();
  const { data: affectedMembers, isLoading: isLoadingAffectedMembers } =
    trpc.viewer.delegationCredential.getAffectedMembersForDisable.useQuery({ id: delegationCredentialId });

  return (
    <div className="mt-4">
      <strong>{t("members_affected_by_disabling_delegation_credential")}</strong>
      {isLoadingAffectedMembers ? (
        <div>{t("loading")}</div>
      ) : affectedMembers?.length ? (
        <>
          <ul className="stack-y-1 list-disc p-1 pl-5 sm:w-80">
            {affectedMembers.slice(0, 5).map((m) => (
              <li className="text-muted text-sm" key={m.email}>
                {m.name ? `${m.name} (${m.email})` : m.email}
              </li>
            ))}
          </ul>
          {affectedMembers.length > 5 && (
            <p className="mt-2 text-sm text-gray-500">
              {t("and_count_more", { count: affectedMembers.length - 5 })}
            </p>
          )}
        </>
      ) : (
        <div className="mt-2">{t("no_members_affected_by_disabling_delegation_credential")}</div>
      )}
    </div>
  );
}
const ToggleDelegationDialog = ({
  delegation,
  onConfirm,
  onClose,
}: {
  delegation: DelegationItemProps["delegation"] | null;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  const { t } = useLocale();

  if (!delegation) {
    return null;
  }

  const isDisablingDelegation = delegation.enabled;

  return (
    <Dialog
      name="toggle-delegation"
      open={!!delegation}
      onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <ConfirmationDialogContent
        title={t(isDisablingDelegation ? "disable_delegation_credential" : "enable_delegation_credential")}
        confirmBtnText={t(isDisablingDelegation ? "disable" : "enable")}
        cancelBtnText={t("cancel")}
        variety={isDisablingDelegation ? "danger" : "success"}
        onConfirm={onConfirm}>
        <p className="mt-5">
          {t(
            isDisablingDelegation
              ? "disable_delegation_credential_description"
              : "enable_delegation_credential_description"
          )}
        </p>
        {isDisablingDelegation && (
          <MembersThatWillBeAffectedOnDisablingDelegationCredential delegationCredentialId={delegation.id} />
        )}
      </ConfirmationDialogContent>
    </Dialog>
  );
};

export default function DelegationCredentialListPage() {
  return <DelegationCredentialList />;
}
