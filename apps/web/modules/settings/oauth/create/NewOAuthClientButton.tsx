"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";

export const NewOAuthClientButton = ({
  onClick,
  dataTestId,
}: {
  onClick: () => void;
  dataTestId: string;
}) => {
  const { t } = useLocale();

  return (
    <Button
      color="secondary"
      StartIcon="plus"
      size="sm"
      variant="fab"
      data-testid={dataTestId}
      onClick={onClick}>
      {t("new")}
    </Button>
  );
};
