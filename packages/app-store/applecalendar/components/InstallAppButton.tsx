import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button, ButtonBaseProps } from "@calcom/ui/Button";

import useAddIntegrationMutation from "../../_utils/useAddIntegrationMutation";
import AddIntegration from "./AddIntegration";

export default function InstallAppButton(props: {
  buttonProps?: ButtonBaseProps & { children?: React.ReactChildren };
}) {
  const { t } = useLocale();
  const mutation = useAddIntegrationMutation("applecalendar");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => {
          setIsModalOpen(true);
        }}
        loading={mutation.isLoading}
        disabled={isModalOpen}
        {...props.buttonProps}>
        {props.buttonProps?.children || t("install_app")}
      </Button>
      <AddIntegration open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
