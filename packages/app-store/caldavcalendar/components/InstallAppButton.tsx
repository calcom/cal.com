import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/Button";

import { InstallAppButtonProps } from "../../types";
import AddIntegration from "./AddIntegration";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const { t } = useLocale();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setIsModalOpen(true);
        }}
        disabled={isModalOpen}
        {...props.buttonProps}>
        {props.buttonProps?.children || t("install_app")}
      </Button>
      <AddIntegration open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
