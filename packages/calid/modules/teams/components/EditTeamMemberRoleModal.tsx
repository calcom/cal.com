"use client";

import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@calid/features/ui/components/dialog";
import { Form, FormField } from "@calid/features/ui/components/form";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { SelectField } from "@calcom/ui/components/form";

import type { TeamMemberData } from "./TeamMembersList";

type EditRoleFormValues = { new_role: MembershipRole };

interface EditTeamMemberRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: TeamMemberData | null;
  currentUserRole: MembershipRole;
  onRoleUpdate: (memberId: number, role: MembershipRole) => void;
  isUpdating?: boolean;
}

export function EditTeamMemberRoleModal({
  isOpen,
  onClose,
  member,
  currentUserRole,
  onRoleUpdate,
  isUpdating = false,
}: EditTeamMemberRoleModalProps) {
  const { t } = useLocale();
  const form = useForm<EditRoleFormValues>({
    defaultValues: { new_role: member?.role ?? MembershipRole.MEMBER },
  });

  useEffect(() => {
    if (member) {
      form.reset({ new_role: member.role });
    }
  }, [member, form]);

  const roleOptions = [
    {
      value: MembershipRole.MEMBER,
      label: t("member"),
      isDisabled: false,
    },
    {
      value: MembershipRole.ADMIN,
      label: t("admin"),
      isDisabled: currentUserRole !== MembershipRole.OWNER,
    },
    {
      value: MembershipRole.OWNER,
      label: t("owner"),
      isDisabled: currentUserRole !== MembershipRole.OWNER,
    },
  ];

  const handleSave = (values: EditRoleFormValues) => {
    if (!member) return;

    if (values.new_role === member.role) {
      onClose();
      return;
    }

    onRoleUpdate(member.user.id, values.new_role);
    onClose();
  };

  const handleClose = () => {
    if (member) {
      form.reset({ new_role: member.role });
    }
    onClose();
  };

  if (!member) return null;

  const displayName =
    member.user.name || member.user.username || member.user.email?.split("@")[0] || "Unknown";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader showIcon={true} iconName="square-pen" iconVariant="info">
          <DialogTitle>{t("edit_team_member_role")}</DialogTitle>
          <DialogDescription>
            {t("edit_team_member_role_description", { name: displayName })}
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={handleSave}>
          <FormField
            control={form.control}
            name="new_role"
            render={({ field }) => (
              <SelectField
                name="new_role"
                options={roleOptions}
                value={roleOptions.find((option) => option.value === field.value) ?? null}
                onChange={(option) => option && field.onChange(option.value as MembershipRole)}
              />
            )}
          />
          <DialogFooter>
            <Button
              variant="button"
              StartIcon="x"
              color="secondary"
              onClick={handleClose}
              disabled={isUpdating}>
              {t("cancel")}
            </Button>
            <Button variant="button" StartIcon="check" color="primary" type="submit" disabled={isUpdating}>
              {isUpdating ? t("updating") : t("save")}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
