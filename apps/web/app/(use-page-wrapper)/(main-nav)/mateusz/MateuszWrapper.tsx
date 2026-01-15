"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import type { ReactElement } from "react";

import { Button } from "@calcom/ui/components/button";

import { MateuszContent } from "./MateuszContent";

export function MateuszWrapper(): ReactElement {
  const { t } = useLocale();

  return (
    <ShellMainAppDir
      heading="Mateusz Dashboard"
      subtitle="A comprehensive UI showcase with interactive elements"
      CTA={
        <Button variant="fab" StartIcon="plus" size="sm">
          {t("new")}
        </Button>
      }>
      <MateuszContent />
    </ShellMainAppDir>
  );
}
