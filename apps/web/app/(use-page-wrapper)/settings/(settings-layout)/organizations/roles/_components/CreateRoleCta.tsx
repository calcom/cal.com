"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { useRoleSheetState } from "../hooks/useRoleQueryStates";

export function CreateRoleCTA() {
  const { t } = useLocale();
  const { setIsOpen } = useRoleSheetState();

  return (
    <Button StartIcon="plus" onClick={() => setIsOpen(true)}>
      {t("create_role")}
    </Button>
  );
}
