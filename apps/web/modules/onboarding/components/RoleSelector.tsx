"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ToggleGroup } from "@calcom/ui/components/form";
import { InfoBadge } from "@calcom/ui/components/badge";

import type { InviteRole } from "../store/onboarding-store";

type RoleSelectorProps = {
  value: InviteRole;
  onValueChange: (value: InviteRole) => void;
  showInfoBadge?: boolean;
};

export const RoleSelector = ({ value, onValueChange, showInfoBadge = false }: RoleSelectorProps) => {
  const { t } = useLocale();

  return (
    <div className="flex items-center justify-between">
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-emphasis text-sm">{t("onboarding_invite_all_as")}</span>
        <ToggleGroup
          value={value}
          onValueChange={(val) => val && onValueChange(val as InviteRole)}
          options={[
            { value: "MEMBER", label: t("members") },
            { value: "ADMIN", label: t("onboarding_admins") },
          ]}
        />
        {showInfoBadge && <InfoBadge content={t("onboarding_modify_roles_later")} />}
      </div>
      {!showInfoBadge && (
        <span className="text-subtle text-sm">{t("onboarding_modify_roles_later")}</span>
      )}
    </div>
  );
};

