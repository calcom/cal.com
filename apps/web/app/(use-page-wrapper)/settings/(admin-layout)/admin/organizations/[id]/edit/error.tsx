"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Alert } from "@calcom/ui/components/alert";

export default function Error() {
  const { t } = useLocale();
  return <Alert severity="error" title={t("something_went_wrong")} />;
}
