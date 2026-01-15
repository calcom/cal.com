"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";

import Shell from "~/shell/Shell";

export default function Error() {
  const { t } = useLocale();
  return (
    <Shell>
      <Alert severity="error" title={t("something_went_wrong")} />
    </Shell>
  );
}
