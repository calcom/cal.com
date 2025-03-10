"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, showToast } from "@calcom/ui";

export default function CopyButton({ error }: { error: string }) {
  const { t } = useLocale();

  return (
    <Button
      color="secondary"
      className="mt-2 border-0 font-sans font-normal hover:bg-gray-300"
      StartIcon="copy"
      onClick={() => {
        navigator.clipboard.writeText(error);
        showToast("Link copied!", "success");
      }}>
      {t("copy")}
    </Button>
  );
}
