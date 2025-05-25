"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/button";

export function CreateRoleCTA() {
  const { t } = useLocale();

  return <Button StartIcon="plus">{t("create_role")}</Button>;
}
