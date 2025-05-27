"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { Form, TextField } from "@calcom/ui/form";

type Role = {
  id: string;
  name: string;
  description?: string;
  teamId?: number;
  createdAt: Date;
  updatedAt: Date;
  type: "SYSTEM" | "CUSTOM";
  permissions: {
    id: string;
    resource: string;
    action: string;
  }[];
};

interface RoleSheetProps {
  role?: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
}

const formSchema = z.object({
  name: z.string().min(1, { message: "role_name_required" }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function RoleSheet({ role, open, onOpenChange, teamId }: RoleSheetProps) {
  const { t } = useLocale();
  const router = useRouter();
  const isEditing = Boolean(role);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
    },
  });

  const createMutation = trpc.viewer.pbac.createRole.useMutation({
    onSuccess: () => {
      showToast(t("role_created_successfully"), "success");
      form.reset();
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      showToast(error.message || t("error_creating_role"), "error");
    },
  });

  const updateMutation = trpc.viewer.pbac.updateRole.useMutation({
    onSuccess: () => {
      showToast(t("role_updated_successfully"), "success");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_role"), "error");
    },
  });

  const onSubmit = (values: FormValues) => {
    if (isEditing && role) {
      updateMutation.mutate({
        teamId,
        roleId: role.id,
        permissions: role.permissions.map((p) => `${p.resource}.${p.action}`),
      });
    } else {
      createMutation.mutate({
        teamId,
        name: values.name,
        description: values.description,
        permissions: [], // Initial permissions will be empty, they can be added later
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditing ? t("edit_role") : t("create_role")}</SheetTitle>
        </SheetHeader>
        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4 py-5">
            <TextField
              label={t("role_name")}
              {...form.register("name")}
              placeholder={t("role_name_placeholder")}
            />
            <TextField
              label={t("role_description")}
              {...form.register("description")}
              placeholder={t("role_description_placeholder")}
            />
            {/* Permission selection will be added here */}
          </div>
          <SheetFooter>
            <Button
              type="button"
              color="secondary"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isLoading || updateMutation.isLoading}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={createMutation.isLoading || updateMutation.isLoading}>
              {isEditing ? t("save") : t("create")}
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
