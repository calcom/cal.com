import { PlusIcon, TrashIcon } from "@heroicons/react/solid";
import React from "react";

import { Button } from "@calcom/ui";

export default function CalButton({ type, label, onClick, readonly, config }) {
  const typeToIcon = {
    delGroup: TrashIcon,
    delRuleGroup: TrashIcon,
    delRule: TrashIcon,
    addRuleGroup: PlusIcon,
    addRule: PlusIcon,
    addGroup: PlusIcon,
    addRuleGroupExt: PlusIcon,
  };
  const typeToColor = {
    addRule: "primary",
    addGroup: "primary",
    delGroup: "secondary",
    delRuleGroup: "secondary",
    delRule: "secondary",
  };

  return (
    <Button
      type="button"
      size="sm"
      disabled={readonly}
      onClick={onClick}
      color={typeToColor[type]}
      StartIcon={typeToIcon[type]}>
      {label}
    </Button>
  );
}
