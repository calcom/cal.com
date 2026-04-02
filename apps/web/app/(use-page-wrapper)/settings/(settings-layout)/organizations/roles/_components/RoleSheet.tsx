"use client";

import type { PermissionString, Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import {
  CrudAction,
  getPermissionsForScope,
  Scope,
} from "@calcom/features/pbac/domain/types/permission-registry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Checkbox, Form, Label, TextField } from "@calcom/ui/components/form";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { revalidateTeamRoles } from "../actions";
import { AdvancedPermissionGroup } from "./AdvancedPermissionGroup";
import RoleColorPicker from "./RoleColorPicker";
import { SimplePermissionItem } from "./SimplePermissionItem";

type Role = {
  id: string;
  name: string;
  description?: string;
  teamId?: number;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  type: "SYSTEM" | "CUSTOM";
  permissions: {
    id: string;
    resource: string;
    action: string;
  }[];
};

const formSchema = z.object({
  name: z.string().min(1, { message: "role_name_required" }),
  description: z.string().optional(),
  isAdvancedMode: z.boolean().default(false),
  permissions: z.array(z.string()),
  color: z.string().default("#FF5733"),
});

type FormValues = z.infer<typeof formSchema>;

interface RoleSheetProps {
  role?: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  scope?: Scope;
  isPrivate?: boolean; // Add isPrivate prop to control permission visibility
}

export function RoleSheet({
  role,
  open,
  onOpenChange,
  teamId,
  scope = Scope.Organization,
  isPrivate = false,
}: RoleSheetProps) {
  const { t } = useLocale();
  const router = useRouter();
  const isEditing = Boolean(role);
  const isSystemRole = role?.type === "SYSTEM";
  const [searchQuery, setSearchQuery] = useState("");

  const defaultValues = useMemo(
    () => ({
      name: role?.name || "",
      description: role?.description || "",
      color: role?.color || "#FF5733",
      isAdvancedMode: false,
      permissions: role?.permissions?.map((p) => `${p.resource}.${p.action}`) || [],
    }),
    [role]
  ); // Memoize default values based on role

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Update form values when role changes
  useEffect(() => {
    // Only reset if the sheet is open to prevent unnecessary resets
    if (open) {
      if (role) {
        form.reset({
          name: role.name,
          description: role.description || "",
          color: role.color || "#FF5733",
          isAdvancedMode: form.getValues("isAdvancedMode"), // Preserve the current mode
          permissions: role.permissions.map((p) => `${p.resource}.${p.action}`),
        });
      } else {
        form.reset({
          name: "",
          description: "",
          color: "#FF5733",
          isAdvancedMode: false,
          permissions: [],
        });
      }
    }
  }, [role, form, open]);

  const { isAdvancedMode, permissions, color } = form.watch();

  const { filteredResources, scopedRegistry } = useMemo(() => {
    // Use privacy-aware filtering if we have privacy information
    const scopedRegistry = getPermissionsForScope(scope, isPrivate);
    const filteredResources = Object.keys(scopedRegistry).filter((resource) =>
      t(
        scopedRegistry[resource as Resource][CrudAction.All as keyof (typeof scopedRegistry)[Resource]]
          ?.i18nKey || ""
      )
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
    return { filteredResources, scopedRegistry };
  }, [searchQuery, t, scope, isPrivate]);

  const createMutation = trpc.viewer.pbac.createRole.useMutation({
    onSuccess: async () => {
      showToast(t("role_created_successfully"), "success");
      form.reset();
      onOpenChange(false);
      await revalidateTeamRoles(teamId);
      router.refresh();
    },
    onError: (error) => {
      showToast(error.message || t("error_creating_role"), "error");
    },
  });

  const updateMutation = trpc.viewer.pbac.updateRole.useMutation({
    onSuccess: async () => {
      showToast(t("role_updated_successfully"), "success");
      onOpenChange(false);
      await revalidateTeamRoles(teamId);
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
        name: values.name,
        permissions: values.permissions as PermissionString[],
        color: values.color,
      });
    } else {
      createMutation.mutate({
        teamId,
        name: values.name,
        description: values.description,
        color: values.color,
        permissions: values.permissions as PermissionString[],
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {isSystemRole ? t("view_role") : isEditing ? t("edit_role") : t("create_role")}
          </SheetTitle>
        </SheetHeader>
        <Form form={form} handleSubmit={onSubmit}>
          <div className="stack-y-4 py-5">
            <div className="flex items-end justify-end gap-2">
              <div className="flex-1">
                <TextField
                  label={t("role_name")}
                  {...form.register("name")}
                  placeholder={t("role_name_placeholder")}
                  disabled={isSystemRole}
                  maxLength={50}
                />
              </div>
              <RoleColorPicker
                value={color}
                onChange={(value) => form.setValue("color", value, { shouldDirty: true })}
                disabled={isSystemRole}
              />
            </div>

            <div className="">
              {isAdvancedMode ? (
                <div className="stack-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="mb-0">{t("permissions")}</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="advanced_mode_checkbox"
                          checked={form.watch("isAdvancedMode")}
                          onCheckedChange={(checked: boolean) => form.setValue("isAdvancedMode", checked)}
                        />
                        <label htmlFor="advanced_mode_checkbox" className="text-sm">
                          {t("advanced")}
                        </label>
                      </div>
                    </div>
                    <TextField
                      id="permissions_search"
                      placeholder={t("search_permissions")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      disabled={isSystemRole}
                    />
                  </div>
                  {filteredResources.map((resource) => (
                    <AdvancedPermissionGroup
                      key={resource}
                      resource={resource as Resource}
                      selectedPermissions={permissions}
                      onChange={(newPermissions) => form.setValue("permissions", newPermissions)}
                      disabled={isSystemRole}
                      scope={scope}
                      isPrivate={isPrivate}
                    />
                  ))}{" "}
                </div>
              ) : (
                <div className="bg-cal-muted rounded-xl p-1">
                  <div className="flex items-center justify-between px-3 py-2">
                    <Label>{t("permissions")}</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={form.watch("isAdvancedMode")}
                        onCheckedChange={(checked: boolean) => form.setValue("isAdvancedMode", checked)}
                      />
                      <span className="text-sm">{t("advanced")}</span>
                    </div>
                  </div>
                  <div className="bg-default border-subtle divide-subtle divide-y rounded-[10px] border">
                    {Object.keys(scopedRegistry).map((resource) => (
                      <SimplePermissionItem
                        key={resource}
                        resource={resource}
                        permissions={permissions}
                        onChange={(newPermissions) => form.setValue("permissions", newPermissions)}
                        disabled={isSystemRole}
                        scope={scope}
                        isPrivate={isPrivate}
                      />
                    ))}
                  </div>{" "}
                </div>
              )}
            </div>
          </div>

          {!isSystemRole && (
            <SheetFooter>
              <Button
                type="button"
                color="secondary"
                onClick={() => onOpenChange(false)}
                disabled={createMutation.isPending || updateMutation.isPending}>
                {t("cancel")}
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {isEditing ? t("save") : t("create")}
              </Button>
            </SheetFooter>
          )}
          {isSystemRole && (
            <SheetFooter>
              <Button type="button" color="secondary" onClick={() => onOpenChange(false)}>
                {t("close")}
              </Button>
            </SheetFooter>
          )}
        </Form>
      </SheetContent>
    </Sheet>
  );
}
