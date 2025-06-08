"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
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

interface RoleSheetProps {
  role?: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
}

type PermissionLevel = "none" | "read" | "all";

const formSchema = z.object({
  name: z.string().min(1, { message: "role_name_required" }),
  description: z.string().optional(),
  isAdvancedMode: z.boolean().default(false),
  permissions: z.array(z.string()),
  color: z.string().default("#FF5733"),
  simplePermissions: z.record(z.enum(["none", "read", "all"])),
});

type FormValues = z.infer<typeof formSchema>;

interface SimplePermissionItemProps {
  resource: string;
  value: PermissionLevel;
  onChange: (value: PermissionLevel) => void;
}

function SimplePermissionItem({ resource, value, onChange }: SimplePermissionItemProps) {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-default text-sm font-medium leading-none">
        {t(RESOURCE_CONFIG[resource as Resource]?.i18nKey || resource)}
      </span>
      <ToggleGroup
        onValueChange={(val) => {
          if (val) onChange(val as PermissionLevel);
        }}
        value={value}
        options={[
          { value: "none", label: t("none") },
          { value: "read", label: t("read_only") },
          { value: "all", label: t("all") },
        ]}
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
  const resourceConfig = RESOURCE_CONFIG[resource];
  const [isExpanded, setIsExpanded] = useState(false);

  const allPermissions = Object.entries(resourceConfig.actions).map(([action]) => `${resource}.${action}`);
  const isAllSelected = allPermissions.every((p) => selectedPermissions.includes(p));

  const handleToggleAll = () => {
    if (isAllSelected) {
      onChange(selectedPermissions.filter((p) => !allPermissions.includes(p)));
    } else {
      onChange(Array.from(new Set([...selectedPermissions, ...allPermissions])));
    }
  };

  return (
    <div className="mb-2 rounded-lg border">
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleToggleAll}
            onClick={(e) => e.stopPropagation()}
          />
          <span>{t(resourceConfig.i18nKey)}</span>
          <span className="text-sm text-gray-500">{t("all_permissions")}</span>
        </div>
        <Button variant="icon" onClick={() => setIsExpanded(!isExpanded)}>
          <Icon
            name="chevron-down"
            className={classNames("h-4 w-4 transition-transform", isExpanded ? "rotate-180" : "")}
          />
        </Button>
      </div>
      {isExpanded && (
        <div className="border-t p-4 pt-0">
          {Object.entries(resourceConfig.actions).map(([action, actionConfig]) => (
            <div key={action} className="flex items-center gap-2 py-2">
              <Checkbox
                checked={selectedPermissions.includes(`${resource}.${action}`)}
                onCheckedChange={(checked) => {
                  const permission = `${resource}.${action}`;
                  onChange(
                    checked
                      ? [...selectedPermissions, permission]
                      : selectedPermissions.filter((p) => p !== permission)
                  );
                }}
              />
              <Label className="flex items-center gap-2">
                <span>{t(actionConfig.i18nKey)}</span>
                <span className="text-sm text-gray-500">{t(actionConfig.descriptionKey)}</span>
              </Label>
            </div>
          ))}
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
      simplePermissions: Object.fromEntries(
        Object.keys(RESOURCE_CONFIG).map((resource) => [resource, "none" as const])
      ),
    },
  });

  const { isAdvancedMode, permissions, color } = form.watch();

  // Convert between simple and advanced permissions
  useEffect(() => {
    if (!isAdvancedMode) {
      const simplePerms = form.getValues("simplePermissions");
      const newPermissions = Object.entries(simplePerms).flatMap(([resource, level]) => {
        const resourceConfig = RESOURCE_CONFIG[resource as Resource];
        if (!resourceConfig) return [];

        switch (level) {
          case "none":
            return [];
          case "read":
            return [`${resource}.${CrudAction.Read}`];
          case "all":
            return Object.keys(resourceConfig.actions).map((action) => `${resource}.${action}`);
        }
      });
      form.setValue("permissions", newPermissions);
    }
  }, [isAdvancedMode, form]);

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
                        value={form.watch(`simplePermissions.${resource}`)}
                        onChange={(value) => form.setValue(`simplePermissions.${resource}`, value)}
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
