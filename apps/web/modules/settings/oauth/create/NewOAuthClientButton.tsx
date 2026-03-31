"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { PlusIcon } from "@coss/ui/icons";
import { Button } from "@coss/ui/components/button";

export const NewOAuthClientButton = ({
  onClick,
  dataTestId,
  isEmptyState,
}: {
  onClick: () => void;
  dataTestId: string;
  isEmptyState?: boolean;
}) => {
  const { t } = useLocale();

  return (
    <Button
      variant={isEmptyState ? "default" : "outline"}
      data-testid={dataTestId}
      onClick={onClick}>
      <PlusIcon aria-hidden />
      {t("new")}
    </Button>
  );
};
