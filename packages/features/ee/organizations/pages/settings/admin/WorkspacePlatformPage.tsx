"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { serviceAccountKeySchema } from "@calcom/prisma/zod-utils";
import { trpc, type RouterOutputs } from "@calcom/trpc";
import {
  Button,
  Form,
  Switch,
  showToast,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
  TextField,
  TextAreaField,
  Table,
  DropdownActions,
} from "@calcom/ui";

const { Body, Cell, ColumnTitle, Header, Row } = Table;

type WorkspacePlatform = RouterOutputs["viewer"]["admin"]["workspacePlatform"]["list"][number];
type EditType = "meta" | "serviceAccount";

type Props = {
  workspacePlatforms: WorkspacePlatform[];
  onAdd: () => void;
  onEdit: (platform: WorkspacePlatform, editType: EditType) => void;
  onToggle: (platform: WorkspacePlatform, checked: boolean) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingPlatform: WorkspacePlatform;
  isCreate: boolean;
  platform: WorkspacePlatform;
  platformId?: number;
  platforms: WorkspacePlatform[];
};

const WorkspacePlatformsPage = () => {
  const { t } = useLocale();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [editing, setEditing] = useState<
    { platform: WorkspacePlatform; editType: EditType } | { platform: null; editType: EditType }
  >({ platform: null, editType: "meta" });

  const utils = trpc.useUtils();
  const { data: workspacePlatforms, isPending, error } = trpc.viewer.admin.workspacePlatform.list.useQuery();
  const toggleEnabledMutation = trpc.viewer.admin.workspacePlatform.toggleEnabled.useMutation({
    onSuccess: () => {
      showToast(t("workspace_platform_updated_successfully"), "success");
      utils.viewer.admin.workspacePlatform.list.invalidate();
    },
    onError: (error) => {
      console.error(error);
      showToast(t("something_went_wrong"), "error");
    },
  });

  if (error) {
    return <ErrorState />;
  }

  if (isPending || !workspacePlatforms) return <LoadingState />;

  return (
    <>
      <PageContent
        workspacePlatforms={workspacePlatforms}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onToggle={handleToggle}
      />
      {editing.editType === "meta" && (
        <CreateUpdatePlatformDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editingPlatform={editing.platform || undefined}
          key={editing.platform?.id}
        />
      )}
      {editing.editType === "serviceAccount" && (
        <UpdateServiceAccountFieldsDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          platformId={editing.platform?.id}
        />
      )}
    </>
  );

  function handleAdd() {
    setEditing({ platform: null, editType: "meta" });
    setIsDialogOpen(true);
  }

  function handleEdit(platform: Props["platform"], editType: "meta" | "serviceAccount" = "meta") {
    setEditing({ platform, editType });
    setIsDialogOpen(true);
  }

  function handleToggle(platform: Props["platform"], checked: boolean) {
    toggleEnabledMutation.mutate({ ...platform, enabled: checked });
  }
};

function LoadingState() {
  const { t } = useLocale();
  return <div>{t("loading")}...</div>;
}

function ErrorState() {
  const { t } = useLocale();
  return <div>{t("something_went_wrong")}</div>;
}

function PageContent({
  workspacePlatforms,
  onAdd,
  onEdit,
  onToggle,
}: Pick<Props, "workspacePlatforms" | "onAdd" | "onEdit" | "onToggle">) {
  return (
    <div>
      {workspacePlatforms.length === 0 ? (
        <EmptyState onAdd={onAdd} />
      ) : (
        <PlatformList platforms={workspacePlatforms} onEdit={onEdit} onToggle={onToggle} onAdd={onAdd} />
      )}
    </div>
  );
}

function EmptyState({ onAdd }: Pick<Props, "onAdd">) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center space-y-4 py-10">
      <p className="text-gray-500">{t("no_workspace_platforms")}</p>
      <Button color="secondary" onClick={onAdd}>
        {t("add")}
      </Button>
    </div>
  );
}

function PlatformList({
  platforms,
  onEdit,
  onToggle,
  onAdd,
}: Pick<Props, "platforms" | "onEdit" | "onToggle" | "onAdd">) {
  const { t } = useLocale();

  return (
    <>
      <Table>
        <Header>
          <ColumnTitle widthClassNames="w-1/4">{t("platform")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-1/4">{t("slug")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-1/4">{t("status")}</ColumnTitle>
          <ColumnTitle widthClassNames="w-1/4">
            <span className="sr-only">{t("actions")}</span>
          </ColumnTitle>
        </Header>
        <Body>
          {platforms.map((platform) => (
            <PlatformListItem key={platform.id} platform={platform} onEdit={onEdit} onToggle={onToggle} />
          ))}
        </Body>
      </Table>
      <div className="mt-4 flex justify-end">
        <Button color="secondary" onClick={onAdd}>
          {t("add")}
        </Button>
      </div>
    </>
  );
}

function ServiceAccountFields() {
  const { t } = useLocale();
  const form = useFormContext();

  return (
    <div className="space-y-4">
      <TextAreaField
        required
        label={t("service_account_key")}
        {...form.register("defaultServiceAccountKey")}
      />
    </div>
  );
}

function UpdateServiceAccountFieldsDialog({
  isOpen,
  onOpenChange,
  platformId,
}: Pick<Props, "isOpen" | "onOpenChange" | "platformId">) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  type FormValues = { defaultServiceAccountKey: string };
  const form = useForm<FormValues>({
    defaultValues: {
      defaultServiceAccountKey: "",
    },
    resolver: zodResolver(z.object({ defaultServiceAccountKey: z.string() })),
  });

  const updateServiceAccountMutation = trpc.viewer.admin.workspacePlatform.updateServiceAccount.useMutation({
    onSuccess: () => {
      showToast(t("service_account_updated_successfully"), "success");
      utils.viewer.admin.workspacePlatform.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      showToast(error.message || t("something_went_wrong"), "error");
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (!platformId) return;

    const parsedKey = JSON.parse(values.defaultServiceAccountKey);
    const validatedKey = serviceAccountKeySchema.safeParse(parsedKey);
    if (!validatedKey.success) {
      form.setError("defaultServiceAccountKey", { message: t("invalid_service_account_key") });
      return;
    }
    updateServiceAccountMutation.mutate({
      id: platformId,
      ...values,
      defaultServiceAccountKey: validatedKey.data,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent title={t("edit_service_account_key")}>
        <Form form={form} handleSubmit={onSubmit}>
          <ServiceAccountFields />
          <DialogFooter>
            <Button type="button" color="minimal" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={updateServiceAccountMutation.isPending}>
              {t("update")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PlatformListItem({ platform, onEdit, onToggle }: Pick<Props, "platform" | "onEdit" | "onToggle">) {
  const { t } = useLocale();

  return (
    <Row>
      <Cell>
        <div className="text-subtle font-medium">
          <span className="text-default">{platform.name}</span>
        </div>
      </Cell>
      <Cell>
        <div className="text-subtle font-medium">
          <span className="text-muted">{platform.slug}</span>
        </div>
      </Cell>
      <Cell>
        <Switch checked={platform.enabled} onCheckedChange={(checked) => onToggle(platform, checked)} />
      </Cell>
      <Cell>
        <div className="flex justify-end">
          <DropdownActions
            actions={[
              {
                id: "edit",
                label: t("edit"),
                onClick: () => onEdit(platform, "meta"),
                icon: "pencil",
              },
              {
                id: "edit-service-account",
                label: t("edit_service_account"),
                onClick: () => onEdit(platform, "serviceAccount"),
                icon: "pencil",
              },
            ]}
          />
        </div>
      </Cell>
    </Row>
  );
}

function CreatePlatformDialog({ isOpen, onOpenChange }: Pick<Props, "isOpen" | "onOpenChange">) {
  const { t } = useLocale();
  type FormValues = { name: string; description: string; slug: string; defaultServiceAccountKey: string };
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      slug: "",
      defaultServiceAccountKey: "",
    },
    resolver: zodResolver(
      z.object({
        name: z.string(),
        description: z.string(),
        slug: z.string(),
        defaultServiceAccountKey: z.string(),
      })
    ),
  });

  const utils = trpc.useUtils();

  const addMutation = trpc.viewer.admin.workspacePlatform.add.useMutation({
    onSuccess: async () => {
      showToast(t("workspace_platform_added_successfully"), "success");
      onOpenChange(false);
      await utils.viewer.admin.workspacePlatform.list.invalidate();
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    const parsedKey = JSON.parse(values.defaultServiceAccountKey);
    const validatedKey = serviceAccountKeySchema.safeParse(parsedKey);
    if (!validatedKey.success) {
      form.setError("defaultServiceAccountKey", { message: t("invalid_service_account_key") });
      return;
    }
    addMutation.mutate({
      ...values,
      defaultServiceAccountKey: validatedKey.data,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent enableOverflow title={t("add_workspace_platform")}>
        <Form form={form} handleSubmit={onSubmit}>
          <PlatformFormFields isCreate={true} />
          <DialogFooter>
            <DialogClose />
            <Button type="submit">{t("create")}</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function UpdatePlatformDialog({
  isOpen,
  onOpenChange,
  editingPlatform,
}: Pick<Props, "isOpen" | "onOpenChange" | "editingPlatform">) {
  const { t } = useLocale();
  type FormValues = { name: string; description: string };
  const form = useForm<FormValues>({
    defaultValues: {
      name: editingPlatform.name,
      description: editingPlatform.description,
    },
  });

  const utils = trpc.useUtils();

  const updateMutation = trpc.viewer.admin.workspacePlatform.update.useMutation({
    onSuccess: async () => {
      showToast(t("workspace_platform_updated_successfully"), "success");
      onOpenChange(false);
      await utils.viewer.admin.workspacePlatform.list.invalidate();
    },
    onError: function (error) {
      showToast(error.message, "error");
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    updateMutation.mutate({ ...values, id: editingPlatform.id });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent title={t("edit_workspace_platform")}>
        <Form form={form} handleSubmit={onSubmit}>
          <PlatformFormFields isCreate={false} />
          <DialogFooter>
            <DialogClose />
            <Button type="submit">{t("save")}</Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function PlatformFormFields({ isCreate }: Pick<Props, "isCreate">) {
  const { t } = useLocale();
  const form = useFormContext();

  return (
    <div className="space-y-4">
      <TextField required label={t("name")} {...form.register("name")} />
      <TextAreaField required label={t("description")} {...form.register("description")} />
      {isCreate && <TextField required label={t("slug")} {...form.register("slug")} />}
      {isCreate && <ServiceAccountFields />}
    </div>
  );
}

function CreateUpdatePlatformDialog({
  isOpen,
  onOpenChange,
  editingPlatform,
}: Pick<Props, "isOpen" | "onOpenChange"> & { editingPlatform?: Props["editingPlatform"] }) {
  if (editingPlatform) {
    return (
      <UpdatePlatformDialog isOpen={isOpen} onOpenChange={onOpenChange} editingPlatform={editingPlatform} />
    );
  }
  return <CreatePlatformDialog isOpen={isOpen} onOpenChange={onOpenChange} />;
}

export default WorkspacePlatformsPage;
