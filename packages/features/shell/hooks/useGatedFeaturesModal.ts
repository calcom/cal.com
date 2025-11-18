import { parseAsStringEnum, useQueryState } from "nuqs";
import { useEffect, useState } from "react";

export enum Features {
  RolesAndPermissions = "roles_and_permissions",
}

const content = {
  [Features.RolesAndPermissions]: {
    badgeText: "roles_and_permissions",
    title: "only_available_on_orgs_plan",
    image: "/gated-features/roles_and_permissions.svg",
    description: "upgrade_team_to_orgs_with_price",
    features: [
      "advanced_roles_and_permissions",
      "team_management_tools",
      "enhanced_security_features",
    ],
  },
}

export function useGatedFeaturesModal() {
  const [upgradeFeature, setUpgradeFeature] = useQueryState(
    "upgradeFeature",
    parseAsStringEnum<Features>(Object.values(Features))
  );

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(!!upgradeFeature);
  }, [upgradeFeature])

  const closeModal = () => {
    setIsOpen(false);
    setUpgradeFeature(null);
  }

  return {
    isOpen,
    closeModal,
    data: upgradeFeature ? content[upgradeFeature] : null,
  }
}
