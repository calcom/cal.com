"use client";

import { useState } from "react";
import { useForm, Controller, useFormContext } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { ServiceAccountKey } from "@calcom/lib/server/serviceAccountKey";
import { serviceAccountKeySchema } from "@calcom/prisma/zod-utils";
import { trpc } from "@calcom/trpc/react";
import {
  DropdownActions,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Form,
  TextField,
  TextAreaField,
  SelectField,
  showToast,
  Badge,
  Switch,
  InfoBadge,
  EmptyScreen,
  SkeletonContainer,
  SkeletonText,
} from "@calcom/ui";

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
      <div className="divide-subtle border-subtle space-y-6 rounded-b-lg border border-t-0 px-6 py-4">
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

  const form = useForm<CreateDelegationData>();

  const handleSubmit = (values: CreateDelegationData) => {
    try {
      const validatedKey = serviceAccountKeySchema.safeParse(values.serviceAccountKey);

      if (!validatedKey.success) {
        form.setError("serviceAccountKey", { message: t("invalid_service_account_key") });
        return;
      }

      values.serviceAccountKey = validatedKey.data;
    } catch (e) {
      form.setError("serviceAccountKey", { message: t("invalid_service_account_key") });
      return;
    }
    handleCreate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent enableOverflow title={t("add_domain_wide_delegation")}>
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
      <DialogContent title={t("edit_domain_wide_delegation")}>
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
    <div className="space-y-4">
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

function DomainWideDelegationList() {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: delegations, isLoading, error } = trpc.viewer.domainWideDelegation.list.useQuery();

  const updateMutation = trpc.viewer.domainWideDelegation.update.useMutation({
    onSuccess: () => utils.viewer.domainWideDelegation.list.invalidate(),
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const toggleEnabledMutation = trpc.viewer.domainWideDelegation.toggleEnabled.useMutation({
    onSuccess: (data) => {
      if (data) {
        showToast(
          data.enabled ? t("domain_wide_delegation_enabled") : t("domain_wide_delegation_disabled"),
          "success"
        );
        utils.viewer.domainWideDelegation.list.invalidate();
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const createMutation = trpc.viewer.domainWideDelegation.add.useMutation({
    onSuccess: () => utils.viewer.domainWideDelegation.list.invalidate(),
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const deleteMutation = trpc.viewer.domainWideDelegation.delete.useMutation({
    onSuccess: () => utils.viewer.domainWideDelegation.list.invalidate(),
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const toggleDelegation = (delegation: DelegationItemProps["delegation"]) => {
    if (delegation) {
      toggleEnabledMutation.mutate({
        id: delegation.id,
        enabled: !delegation.enabled,
      });
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
    trpc.viewer.domainWideDelegation.listWorkspacePlatforms.useQuery();

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
        {t("add_domain_wide_delegation")}
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
      {!!delegations?.length ? (
        <>
          <ul className="space-y-2 [&>*:last-child]:rounded-b-xl">
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
          <AddDwDButton />
        </>
      ) : (
        <EmptyScreen
          Icon="link"
          headline={t("add_domain_wide_delegation")}
          description={t("domain_wide_delegation_description")}
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
    </div>
  );
}

export default function DomainWideDelegationListPage() {
  return <DomainWideDelegationList />;
}
