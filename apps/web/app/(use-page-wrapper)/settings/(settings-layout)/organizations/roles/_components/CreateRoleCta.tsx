"use client";

import { useQueryState } from "nuqs";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/button";

import { roleParsers } from "./searchParams";

export function CreateRoleCTA() {
  const { t } = useLocale();
  const [, setIsOpen] = useQueryState("role-sheet", roleParsers["role-sheet"]);

  return (
    <Button StartIcon="plus" onClick={() => setIsOpen(true)}>
      {t("create_role")}
    </Button>
  );
}
