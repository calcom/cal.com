"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@coss/ui/components/button";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export const CreateNewWebhookButton = ({ isEmptyState }: { isEmptyState?: boolean }): JSX.Element => {
  const router = useRouter();
  const { t } = useLocale();
  let variant: "default" | "outline" = "outline";

  if (isEmptyState) {
    variant = "default";
  }

  return (
    <Button data-testid="new_webhook" onClick={(): void => router.push("webhooks/new")} variant={variant}>
      <PlusIcon aria-hidden="true" />
      {t("new")}
    </Button>
  );
};

export default CreateNewWebhookButton;
