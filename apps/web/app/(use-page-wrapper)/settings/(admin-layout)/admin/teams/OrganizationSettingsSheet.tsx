"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField, BooleanToggleGroupField } from "@calcom/ui/components/form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@calcom/ui/components/sheet";
import { showToast } from "@calcom/ui/components/toast";

const orgSettingsSchema = z.object({
  isOrganizationConfigured: z.boolean(),
  isOrganizationVerified: z.boolean(),
  orgAutoAcceptEmail: z.string().email(),
  lockEventTypeCreationForUsers: z.boolean(),
  adminGetsNoSlotsNotification: z.boolean(),
  isAdminReviewed: z.boolean(),
  isAdminAPIEnabled: z.boolean(),
  allowSEOIndexing: z.boolean(),
  orgProfileRedirectsToVerifiedDomain: z.boolean(),
  disablePhoneOnlySMSNotifications: z.boolean(),
});

type OrgSettingsFormData = z.infer<typeof orgSettingsSchema>;

interface OrganizationSettingsSheetProps {
  teamId: number;
  organizationSettings: {
    isOrganizationConfigured?: boolean;
    isOrganizationVerified?: boolean;
    orgAutoAcceptEmail?: string;
    lockEventTypeCreationForUsers?: boolean;
    adminGetsNoSlotsNotification?: boolean;
    isAdminReviewed?: boolean;
    isAdminAPIEnabled?: boolean;
    allowSEOIndexing?: boolean;
    orgProfileRedirectsToVerifiedDomain?: boolean;
    disablePhoneOnlySMSNotifications?: boolean;
  } | null;
  open: boolean;
  onClose: () => void;
}

export function OrganizationSettingsSheet({
  teamId,
  organizationSettings,
  open,
  onClose,
}: OrganizationSettingsSheetProps) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const form = useForm<OrgSettingsFormData>({
    resolver: zodResolver(orgSettingsSchema),
    defaultValues: {
      isOrganizationConfigured: organizationSettings?.isOrganizationConfigured || false,
      isOrganizationVerified: organizationSettings?.isOrganizationVerified || false,
      orgAutoAcceptEmail: organizationSettings?.orgAutoAcceptEmail || "",
      lockEventTypeCreationForUsers: organizationSettings?.lockEventTypeCreationForUsers || false,
      adminGetsNoSlotsNotification: organizationSettings?.adminGetsNoSlotsNotification || false,
      isAdminReviewed: organizationSettings?.isAdminReviewed || false,
      isAdminAPIEnabled: organizationSettings?.isAdminAPIEnabled || false,
      allowSEOIndexing: organizationSettings?.allowSEOIndexing || false,
      orgProfileRedirectsToVerifiedDomain: organizationSettings?.orgProfileRedirectsToVerifiedDomain || false,
      disablePhoneOnlySMSNotifications: organizationSettings?.disablePhoneOnlySMSNotifications || false,
    },
  });

  const updateOrgSettingsMutation = trpc.viewer.admin.teams.updateOrganizationSettings.useMutation({
    onSuccess: () => {
      showToast(t("organization_settings_updated"), "success");
      utils.viewer.admin.teams.get.invalidate({ teamId });
      onClose();
    },
    onError: (error) => {
      showToast(error.message || t("error_updating_organization_settings"), "error");
    },
  });

  const onSubmit = (data: OrgSettingsFormData) => {
    updateOrgSettingsMutation.mutate({
      teamId,
      data,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{t("organization_settings")}</SheetTitle>
          <SheetDescription>{t("organization_settings_description")}</SheetDescription>
        </SheetHeader>

        <Form form={form} handleSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <TextField
              label={t("org_auto_accept_email")}
              type="email"
              {...form.register("orgAutoAcceptEmail")}
              error={form.formState.errors.orgAutoAcceptEmail?.message}
            />

            <BooleanToggleGroupField
              label={t("is_organization_configured")}
              {...form.register("isOrganizationConfigured")}
            />

            <BooleanToggleGroupField
              label={t("is_organization_verified")}
              {...form.register("isOrganizationVerified")}
            />

            <BooleanToggleGroupField
              label={t("lock_event_type_creation_for_users")}
              {...form.register("lockEventTypeCreationForUsers")}
            />

            <BooleanToggleGroupField
              label={t("admin_gets_no_slots_notification")}
              {...form.register("adminGetsNoSlotsNotification")}
            />

            <BooleanToggleGroupField label={t("is_admin_reviewed")} {...form.register("isAdminReviewed")} />

            <BooleanToggleGroupField
              label={t("is_admin_api_enabled")}
              {...form.register("isAdminAPIEnabled")}
            />

            <BooleanToggleGroupField label={t("allow_seo_indexing")} {...form.register("allowSEOIndexing")} />

            <BooleanToggleGroupField
              label={t("org_profile_redirects_to_verified_domain")}
              {...form.register("orgProfileRedirectsToVerifiedDomain")}
            />

            <BooleanToggleGroupField
              label={t("disable_phone_only_sms_notifications")}
              {...form.register("disablePhoneOnlySMSNotifications")}
            />
          </div>

          <SheetFooter>
            <Button type="button" color="secondary" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={updateOrgSettingsMutation.isPending}>
              {t("save_changes")}
            </Button>
          </SheetFooter>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
