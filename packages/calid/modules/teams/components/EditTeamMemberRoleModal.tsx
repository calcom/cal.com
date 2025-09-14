"use client";

import { useState } from "react";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { Button } from "@calid/features/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@calid/features/ui/components/dialog";
import { Select } from "@calcom/ui/form/select";
import { triggerToast } from "@calid/features/ui/components/toast";
import type { TeamMemberData } from "./TeamMembersList";

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
  const [selectedRole, setSelectedRole] = useState<MembershipRole | null>(null);

  // Initialize selected role when member changes
  useState(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  });

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

  const handleSave = () => {
    if (!member || !selectedRole) return;

    // Prevent changing to the same role
    if (selectedRole === member.role) {
      onClose();
      return;
    }

    onRoleUpdate(member.user.id, selectedRole);
    onClose();
  };

  const handleClose = () => {
    setSelectedRole(member?.role || null);
    onClose();
  };

  if (!member) return null;

  const displayName = member.user.name || member.user.username || member.user.email?.split("@")[0] || "Unknown";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit_team_member_role")}</DialogTitle>
          <DialogDescription>
            {t("edit_team_member_role_description", { name: displayName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member Info */}
          <div className="flex items-center space-x-3 rounded-lg border bg-gray-50 p-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <p className="text-xs text-gray-500">{member.user.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Current Role</p>
              <p className="text-sm font-medium text-gray-900">
                {member.role.charAt(0).toUpperCase() + member.role.slice(1).toLowerCase()}
              </p>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">{t("new_role")}</label>
            <Select
              value={roleOptions.find((option) => option.value === selectedRole) || null}
              onChange={(option) => setSelectedRole(option?.value as MembershipRole)}
              options={roleOptions}
              placeholder={t("select_role")}
              isSearchable={false}
              className="w-full"
            />
          </div>

          {/* Warning for Owner role change */}
          {selectedRole === MembershipRole.OWNER && member.role !== MembershipRole.OWNER && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                <strong>{t("warning")}:</strong> {t("owner_role_change_warning")}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4">
          <Button
            variant="button"
            color="minimal"
            onClick={handleClose}
            disabled={isUpdating}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="button"
            color="primary"
            onClick={handleSave}
            disabled={isUpdating || !selectedRole || selectedRole === member.role}
          >
            {isUpdating ? t("updating") : t("save_changes")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
