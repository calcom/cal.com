"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { RESOURCE_CONFIG } from "@calcom/features/pbac/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/button";
import classNames from "@calcom/ui/classNames";
import { ToggleGroup } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";
import { Form, TextField, Checkbox, Label } from "@calcom/ui/form";

import RoleColorPicker from "./RoleColorPicker";
import type { PermissionLevel } from "./usePermissions";
import { usePermissions } from "./usePermissions";

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
}

interface SimplePermissionItemProps {
  resource: string;
  permissions: string[];
  onChange: (permissions: string[]) => void;
}

function SimplePermissionItem({ resource, permissions, onChange }: SimplePermissionItemProps) {
  const { t } = useLocale();
  const { getResourcePermissionLevel, toggleResourcePermissionLevel } = usePermissions();

  const isAllResources = resource === "*";
  const options = isAllResources
    ? [
        { value: "none", label: t("none") },
        { value: "all", label: t("all") },
      ]
    : [
        { value: "none", label: t("none") },
        { value: "read", label: t("read_only") },
        { value: "all", label: t("all") },
      ];

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-default text-sm font-medium leading-none">
        {t(RESOURCE_CONFIG[resource as Resource]?.i18nKey || resource)}
      </span>
      <ToggleGroup
        onValueChange={(val) => {
          if (val) onChange(toggleResourcePermissionLevel(resource, val as PermissionLevel, permissions));
        }}
        value={getResourcePermissionLevel(resource, permissions)}
        options={options}
      />
    </div>
  );
}

interface AdvancedPermissionGroupProps {
  resource: Resource;
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}

function AdvancedPermissionGroup({ resource, selectedPermissions, onChange }: AdvancedPermissionGroupProps) {
  const { t } = useLocale();
  const { hasAllPermissions, toggleSinglePermission } = usePermissions();
  const resourceConfig = RESOURCE_CONFIG[resource];
  const [isExpanded, setIsExpanded] = useState(false);

  const isAllResources = resource === "*";
  const allResourcesSelected = selectedPermissions.includes("*.*");

  // Get all possible permissions for this resource
  const allPermissions = isAllResources
    ? ["*.*"]
    : Object.entries(resourceConfig.actions).map(([action]) => `${resource}.${action}`);

  // Check if all permissions for this resource are selected
  const isAllSelected = isAllResources
    ? allResourcesSelected
    : allPermissions.every((p) => selectedPermissions.includes(p));

  const handleToggleAll = () => {
    if (isAllResources) {
      if (allResourcesSelected) {
        onChange(selectedPermissions.filter((p) => p !== "*.*"));
      } else {
        const allPossiblePerms = Object.entries(RESOURCE_CONFIG).flatMap(([res, config]) => {
          if (res === "*") return [];
          return Object.keys(config.actions).map((action) => `${res}.${action}`);
        });
        onChange(["*.*", ...allPossiblePerms]);
      }
    } else {
      const otherPermissions = selectedPermissions.filter((p) => !allPermissions.includes(p));
      if (isAllSelected) {
        onChange(otherPermissions);
      } else {
        const newPermissions = [...otherPermissions, ...allPermissions];
        if (hasAllPermissions(newPermissions)) {
          newPermissions.push("*.*");
        }
        onChange(newPermissions);
      }
    }
  };

  return (
    <div className="bg-muted border-subtle mb-2 rounded-xl border">
      <button
        type="button"
        className="flex cursor-pointer items-center justify-between gap-1.5 p-4"
        onClick={() => setIsExpanded(!isExpanded)}>
        <Icon
          name="chevron-down"
          className={classNames("h-4 w-4 transition-transform", isExpanded ? "rotate-180" : "")}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleToggleAll}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-default text-sm font-medium leading-none">{t(resourceConfig.i18nKey)}</span>
          <span className="text-muted text-sm font-medium leading-none">{t("all_permissions")}</span>
        </div>
      </button>
      {isExpanded && !isAllResources && (
        <div className="bg-default border-muted m-1 flex flex-col gap-2.5 rounded-xl border p-3">
          {Object.entries(resourceConfig.actions).map(([action, actionConfig]) => {
            const permission = `${resource}.${action}`;
            return (
              <div key={action} className="flex items-center">
                <Checkbox
                  id={permission}
                  checked={selectedPermissions.includes(permission)}
                  className="mr-2"
                  onCheckedChange={(checked) => {
                    onChange(toggleSinglePermission(permission, !!checked, selectedPermissions));
                  }}
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor={permission} className="mb-0">
                    <span>{t(actionConfig.i18nKey)}</span>
                  </Label>
                  <span className="text-sm text-gray-500">{t(actionConfig.descriptionKey)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RoleSheet({ role, open, onOpenChange, teamId }: RoleSheetProps) {
  const { t } = useLocale();
  const router = useRouter();
  const isEditing = Boolean(role);
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: role?.name || "",
      description: role?.description || "",
      color: role?.color || "#FF5733",
      isAdvancedMode: false,
      permissions: role?.permissions.map((p) => `${p.resource}.${p.action}`) || [],
    },
  });

  const { isAdvancedMode, permissions, color } = form.watch();

  const filteredResources = useMemo(() => {
    return Object.keys(RESOURCE_CONFIG).filter((resource) =>
      t(RESOURCE_CONFIG[resource as Resource].i18nKey)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, t]);

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
    // Store the color in localStorage
    const roleKey = isEditing && role ? role.id : `new_role_${values.name}`;
    localStorage.setItem(`role_color_${roleKey}`, values.color);

    if (isEditing && role) {
      updateMutation.mutate({
        teamId,
        roleId: role.id,
        permissions: values.permissions as any,
      });
    } else {
      createMutation.mutate({
        teamId,
        name: values.name,
        description: values.description,
        permissions: values.permissions as any,
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
            <div className="flex items-end justify-end gap-2">
              <div className="flex-1">
                <TextField
                  label={t("role_name")}
                  {...form.register("name")}
                  placeholder={t("role_name_placeholder")}
                />
              </div>
              <RoleColorPicker
                value={color}
                onChange={(value) => form.setValue("color", value, { shouldDirty: true })}
              />
            </div>

            <div className="">
              {isAdvancedMode ? (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label className="mb-0">{t("permissions")}</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={form.watch("isAdvancedMode")}
                          onCheckedChange={(checked: boolean) => form.setValue("isAdvancedMode", checked)}
                        />
                        <span className="text-sm">{t("advanced")}</span>
                      </div>
                    </div>
                    <TextField
                      id="permissions_search"
                      placeholder={t("search_permissions")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {filteredResources.map((resource) => (
                    <AdvancedPermissionGroup
                      key={resource}
                      resource={resource as Resource}
                      selectedPermissions={permissions}
                      onChange={(newPermissions) => form.setValue("permissions", newPermissions)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-1">
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
                    {Object.keys(RESOURCE_CONFIG).map((resource) => (
                      <SimplePermissionItem
                        key={resource}
                        resource={resource}
                        permissions={permissions}
                        onChange={(newPermissions) => form.setValue("permissions", newPermissions)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

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
        </Form>
      </SheetContent>
    </Sheet>
  );
}
