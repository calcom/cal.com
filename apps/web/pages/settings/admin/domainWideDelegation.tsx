"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Button,
  Form,
  Meta,
  Switch,
  showToast,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  List,
  TextField,
  SelectField,
  TextAreaField,
} from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import { getLayout } from "@components/auth/layouts/AdminLayout";

const DomainWideDelegationPage = () => {
  const { t } = useLocale();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState(null);

  const {
    data: domainWideDelegations,
    isLoading,
    error,
  } = trpc.viewer.admin.domainWideDelegation.list.useQuery();

  if (error) {
    return <ErrorState />;
  }
  if (isLoading) return <LoadingState />;
  const defaultValues = !editingDelegation
    ? {
        workspacePlatform: "GOOGLE",
        serviceAccountKey: "",
        organizationId: null,
        enabled: true,
      }
    : editingDelegation;
  return (
    <>
      <Meta title={t("domain_wide_delegation")} description={t("domain_wide_delegation_description")} />
      <PageContent
        domainWideDelegations={domainWideDelegations}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onToggle={handleToggle}
      />
      <CreateUpdateDelegationDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingDelegation={editingDelegation}
        defaultValues={defaultValues}
        key={editingDelegation?.id}
      />
    </>
  );

  function handleAdd() {
    setEditingDelegation(null);
    setIsDialogOpen(true);
  }

  function handleEdit(delegation) {
    setEditingDelegation(delegation);
    setIsDialogOpen(true);
  }

  function handleToggle(delegation, checked) {
    updateMutation.mutate({ ...delegation, enabled: checked });
  }
};

function LoadingState() {
  return <div>Loading...</div>;
}

function ErrorState() {
  return <div>Some error occurred</div>;
}

function PageContent({ domainWideDelegations, onAdd, onEdit, onToggle }) {
  const { t } = useLocale();
  return (
    <div className="mt-6 flex flex-col space-y-8">
      <div className="flex flex-col space-y-4">
        <h2 className="font-cal text-2xl">{t("domain_wide_delegation")}</h2>
        <p>{t("domain_wide_delegation_description")}</p>
      </div>
      {domainWideDelegations.length === 0 ? (
        <EmptyState onAdd={onAdd} />
      ) : (
        <DelegationList
          delegations={domainWideDelegations}
          onEdit={onEdit}
          onToggle={onToggle}
          onAdd={onAdd}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-10">
      <p className="text-gray-500">{t("no_domain_wide_delegations")}</p>
      <Button color="secondary" onClick={onAdd}>
        {t("add_domain_wide_delegation")}
      </Button>
    </div>
  );
}

function DelegationList({ delegations, onEdit, onToggle, onAdd }) {
  const { t } = useLocale();

  return (
    <>
      <List>
        {delegations.map((delegation) => (
          <DelegationListItem
            key={delegation.id}
            delegation={delegation}
            onEdit={onEdit}
            onToggle={onToggle}
          />
        ))}
      </List>
      <div className="flex justify-end">
        <Button color="secondary" onClick={onAdd}>
          {t("add_domain_wide_delegation")}
        </Button>
      </div>
    </>
  );
}

function DelegationListItem({ delegation, onEdit, onToggle }) {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const deleteMutation = trpc.viewer.admin.domainWideDelegation.delete.useMutation({
    onSuccess: () => {
      showToast(t("domain_wide_delegation_deleted_successfully"), "success");
      utils.viewer.admin.domainWideDelegation.list.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const handleDelete = () => {
    if (window.confirm(t("confirm_delete_domain_wide_delegation"))) {
      deleteMutation.mutate({ id: delegation.id });
    }
  };

  return (
    <li className="flex items-center justify-between py-4">
      <div>
        <p className="font-medium">{delegation.organizationId}</p>
        <p className="text-sm text-gray-500">{delegation.workspacePlatform}</p>
      </div>
      <div className="flex items-center space-x-2">
        <Switch checked={delegation.enabled} onCheckedChange={(checked) => onToggle(delegation, checked)} />
        <Button color="secondary" onClick={() => onEdit(delegation)}>
          {t("edit")}
        </Button>
        <Button color="destructive" onClick={handleDelete}>
          {t("delete")}
        </Button>
      </div>
    </li>
  );
}

function CreateUpdateDelegationDialog({ isOpen, onOpenChange, editingDelegation, defaultValues }) {
  const { t } = useLocale();
  const form = useForm({
    defaultValues,
  });

  const utils = trpc.useContext();

  const updateMutation = trpc.viewer.admin.domainWideDelegation.update.useMutation({
    onSuccess: handleMutationSuccess,
    onError: handleMutationError,
  });

  const addMutation = trpc.viewer.admin.domainWideDelegation.add.useMutation({
    onSuccess: handleMutationSuccess,
    onError: handleMutationError,
  });

  function onSubmit(values) {
    if (editingDelegation) {
      updateMutation.mutate({ ...values, id: editingDelegation.id });
    } else {
      addMutation.mutate(values);
    }
  }

  function handleMutationSuccess() {
    showToast(t("domain_wide_delegation_updated_successfully"), "success");
    onOpenChange(false);
    utils.viewer.admin.domainWideDelegation.list.invalidate();
  }

  function handleMutationError(error) {
    showToast(error.message, "error");
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        title={editingDelegation ? t("edit_domain_wide_delegation") : t("add_domain_wide_delegation")}>
        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4">
            <TextField
              label={t("organization_id")}
              placeholder={t("enter_organization_id")}
              {...form.register("organizationId", { valueAsNumber: true })}
            />
            <Controller
              name="workspacePlatform"
              render={({ field: { value, onChange } }) => (
                <SelectField
                  label={t("workspace_platform")}
                  onChange={(option) => {
                    onChange(option?.value);
                  }}
                  value={[
                    { value: "GOOGLE", label: "Google" },
                    { value: "MICROSOFT", label: "Microsoft" },
                  ].find((opt) => opt.value === value)}
                  options={[
                    { value: "GOOGLE", label: "Google" },
                    { value: "MICROSOFT", label: "Microsoft" },
                  ]}
                />
              )}
            />
            {!editingDelegation && (
              <TextAreaField
                label={t("service_account_key")}
                placeholder={t("paste_service_account_key_here")}
                {...form.register("serviceAccountKey")}
              />
            )}
            <Controller
              control={form.control}
              name="enabled"
              render={({ field: { value, onChange } }) => (
                <Switch
                  checked={value}
                  onCheckedChange={onChange}
                  label={t("enable_domain_wide_delegation")}
                />
              )}
            />
          </div>
          <DialogFooter>
            <DialogClose />
            <Button type="submit">{editingDelegation ? t("save_changes") : t("add_delegation")}</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

DomainWideDelegationPage.getLayout = getLayout;
DomainWideDelegationPage.PageWrapper = PageWrapper;

export default DomainWideDelegationPage;
