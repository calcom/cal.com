"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useState } from "react";
import { PbacOptInModal } from "./PbacOptInModal";
import { RolesList } from "./RolesList";

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

interface PbacOptInViewProps {
  revalidateRolesPath: () => Promise<void>;
  systemRoles: Role[];
  teamId: number;
}

export function PbacOptInView({ revalidateRolesPath, systemRoles, teamId }: PbacOptInViewProps) {
  const [open, setOpen] = useState(true);
  const { t } = useLocale();

  return (
    <>
      <SettingsHeader
        title={t("roles_and_permissions")}
        description={t("roles_and_permissions_description")}
        borderInShellHeader={false}
        CTA={null}>
        <RolesList
          teamId={teamId}
          roles={systemRoles}
          permissions={{
            canCreate: false,
            canRead: true,
            canUpdate: false,
            canDelete: false,
          }}
          isPrivate={false}
        />
      </SettingsHeader>
      <PbacOptInModal open={open} onOpenChange={setOpen} revalidateRolesPath={revalidateRolesPath} />
    </>
  );
}
