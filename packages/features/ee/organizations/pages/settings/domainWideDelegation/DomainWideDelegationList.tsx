import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import {
  Dropdown,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  Form,
  TextField,
  SelectField,
  showToast,
} from "@calcom/ui";

interface DelegationItemProps {
  delegation: {
    id: string;
    domain: string;
    enabled: boolean;
    workspacePlatform: {
      name: string;
      slug: string;
    };
    clientId: string;
    organizationId: number;
  };
  toggleDelegation: (id: string) => void;
  onEdit: (delegation: DelegationItemProps["delegation"]) => void;
}

function DelegationListItemActions({
  delegation,
  toggleDelegation,
  onEdit,
}: {
  delegation: DelegationItemProps["delegation"];
  toggleDelegation: (id: string) => void;
  onEdit: (delegation: DelegationItemProps["delegation"]) => void;
}) {
  const { t } = useLocale();

  return (
    <Dropdown>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="icon"
          color="secondary"
          StartIcon="ellipsis"
          className="ltr:radix-state-open:rounded-r-md rtl:radix-state-open:rounded-l-md"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Button
            type="button"
            color="minimal"
            StartIcon={delegation.enabled ? "check" : "x"}
            onClick={() => toggleDelegation(delegation.id)}>
            {delegation.enabled ? t("disable") : t("enable")}
          </Button>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Button type="button" color="minimal" StartIcon="pencil" onClick={() => onEdit(delegation)}>
            {t("edit")}
          </Button>
        </DropdownMenuItem>
        {/* Add more menu items as needed */}
      </DropdownMenuContent>
    </Dropdown>
  );
}

function DelegationListItem({ delegation, toggleDelegation, onEdit }: DelegationItemProps) {
  const { t } = useLocale();

  return (
    <li className="border-subtle bg-default divide-subtle flex flex-col divide-y rounded-lg border">
      <div className="flex items-center justify-between space-x-2 p-4">
        <div className="flex items-center space-x-2">
          <span className="mr-2">{delegation.domain}</span>
          <span>{delegation.workspacePlatform.name}</span>
        </div>
        <DelegationListItemActions
          delegation={delegation}
          toggleDelegation={toggleDelegation}
          onEdit={onEdit}
        />
      </div>
    </li>
  );
}

function CreateEditDelegationDialog({
  isOpen,
  onClose,
  delegation,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  delegation: DelegationItemProps["delegation"] | null;
  onSubmit: (data: { domain: string; workspacePlatformSlug: string; enabled: boolean }) => void;
}) {
  const { t } = useLocale();
  const form = useForm<{ domain: string; workspacePlatformSlug: string; enabled: boolean }>({
    defaultValues: {
      domain: delegation?.domain || "",
      workspacePlatformSlug: delegation?.workspacePlatform.slug || "",
      enabled: delegation?.enabled ?? true,
    },
  });

  // TODO: Use tRPC route
  const workspacePlatformOptions = [
    { value: "google", label: "Google" },
    { value: "microsoft", label: "Microsoft" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <Form form={form} handleSubmit={onSubmit}>
          <TextField label={t("domain")} {...form.register("domain")} />
          <Controller
            name="workspacePlatformSlug"
            control={form.control}
            render={({ field: { value, onChange } }) => (
              <SelectField
                label={t("workspace_platform")}
                onChange={(option) => onChange(option?.value)}
                value={workspacePlatformOptions.find((opt) => opt.value === value)}
                options={workspacePlatformOptions}
              />
            )}
          />
          <DialogFooter>
            <Button type="button" color="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit">{delegation ? t("save") : t("create")}</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function DomainWideDelegationList() {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const { data: delegations, isLoading } = trpc.viewer.domainWideDelegation.list.useQuery();

  const updateMutation = trpc.viewer.domainWideDelegation.update.useMutation({
    onSuccess: () => utils.viewer.domainWideDelegation.list.invalidate(),
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

  const toggleDelegation = (id: string) => {
    const delegation = delegations?.find((d) => d.id === id);
    if (delegation) {
      updateMutation.mutate({
        id,
        workspacePlatformSlug: delegation.workspacePlatform.slug,
        enabled: !delegation.enabled,
        organizationId: delegation.organizationId,
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

  const onEditClick = (delegation: DelegationItemProps["delegation"]) => {
    setCreateEditDialog({ isOpen: true, delegation });
  };

  const onCreateClick = () => setCreateEditDialog({ isOpen: true, delegation: null });

  const handleSubmit = (data: { domain: string; workspacePlatformSlug: string; enabled: boolean }) => {
    if (createEditDialog.delegation) {
      updateMutation.mutate({
        id: createEditDialog.delegation.id,
        ...data,
        organizationId: createEditDialog.delegation.organizationId,
      });
    } else {
      createMutation.mutate({
        ...data,
        organizationId: 0, // You might need to get the correct organizationId here
      });
    }
    setCreateEditDialog({ isOpen: false, delegation: null });
  };

  if (isLoading) {
    return <div>{t("loading")}</div>;
  }

  return (
    <div>
      <ul>
        {delegations?.map((delegation) => (
          <DelegationListItem
            key={delegation.id}
            delegation={delegation}
            toggleDelegation={toggleDelegation}
            onEdit={onEditClick}
          />
        ))}
      </ul>
      <CreateEditDelegationDialog
        isOpen={createEditDialog.isOpen}
        onClose={() => setCreateEditDialog({ isOpen: false, delegation: null })}
        delegation={createEditDialog.delegation}
        onSubmit={handleSubmit}
      />
      <Button type="button" color="secondary" StartIcon="plus" className="mt-6" onClick={onCreateClick}>
        {t("add_domain_wide_delegation")}
      </Button>
    </div>
  );
}
