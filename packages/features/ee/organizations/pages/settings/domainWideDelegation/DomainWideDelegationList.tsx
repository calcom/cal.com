import { useState } from "react";
import { useForm, Controller } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
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
} from "@calcom/ui";

interface DelegationItemProps {
  delegation: {
    id: number;
    domain: string;
    enabled: boolean;
    workspacePlatform: {
      name: string;
      slug: string;
    };
    clientId: string;
  };
  toggleDelegation: (id: number) => void;
  onEdit: (delegation: DelegationItemProps["delegation"]) => void;
}

function DelegationListItemActions({
  delegation,
  toggleDelegation,
  onEdit,
}: {
  delegation: DelegationItemProps["delegation"];
  toggleDelegation: (id: number) => void;
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
  onSubmit: (data: { domain: string; clientId: string; workspacePlatform: string }) => void;
}) {
  const { t } = useLocale();
  const form = useForm<{ domain: string; clientId: string; workspacePlatform: string }>({
    defaultValues: {
      domain: delegation?.domain || "",
      clientId: delegation?.clientId || "",
      workspacePlatform: delegation?.workspacePlatform.slug || "",
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
            name="workspacePlatform"
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
  // TODO: Use tRPC route
  const [delegations, setDelegations] = useState([
    {
      id: 1,
      domain: "example.com",
      enabled: true,
      workspacePlatform: {
        name: "Google",
        slug: "google",
      },
      clientId: "123",
    },
  ]);

  const toggleDelegation = (id: number) => {
    // TODO: Use tRPC route
    setDelegations((prevDelegations) =>
      prevDelegations.map((delegation) =>
        delegation.id === id ? { ...delegation, enabled: !delegation.enabled } : delegation
      )
    );
  };

  const updateDelegation = (id: number, data: { domain: string; workspacePlatform: string }) => {
    // TODO: Use tRPC route
    setDelegations((prevDelegations) =>
      prevDelegations.map((delegation) =>
        delegation.id === id
          ? {
              ...delegation,
              domain: data.domain,
              workspacePlatform: {
                name: data.workspacePlatform === "google" ? "Google" : "Microsoft",
                slug: data.workspacePlatform,
              },
            }
          : delegation
      )
    );
  };

  const createDelegation = (data: { domain: string; workspacePlatform: string; clientId: string }) => {
    const newDelegation = {
      id: Date.now(), // Use a proper ID generation method in production
      domain: data.domain,
      clientId: data.clientId,
      enabled: true,
      workspacePlatform: {
        name: data.workspacePlatform === "google" ? "Google" : "Microsoft",
        slug: data.workspacePlatform,
      },
    };
    setDelegations((prevDelegations) => [...prevDelegations, newDelegation]);
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

  const handleSubmit = (data: { domain: string; workspacePlatform: string }) => {
    if (createEditDialog.delegation) {
      updateDelegation(createEditDialog.delegation.id, data);
    } else {
      createDelegation(data);
    }
    setCreateEditDialog({ isOpen: false, delegation: null });
  };

  return (
    <div>
      <ul>
        {delegations.map((delegation) => (
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
