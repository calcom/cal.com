import { useState } from "react";

import type { InstallAppButtonProps } from "../../types";
import AddIntegration from "./AccountDialog";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {props.render({
        onClick() {
          setIsModalOpen(true);
        },
        disabled: isModalOpen,
      })}
      <AddIntegration open={isModalOpen} onOpenChange={setIsModalOpen} />
    </>
  );
}
