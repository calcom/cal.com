import { TrashIcon } from "@heroicons/react/solid";
import React from "react";

import { Button } from "@calcom/ui";

export default function CalButton({ type, label, onClick, readonly, config }) {
  if (type === "delRule" || type == "delGroup") {
    return (
      <button className="ml-5">
        <TrashIcon className="m-0 h-4 w-4 text-neutral-500" onClick={onClick}></TrashIcon>
      </button>
    );
  }
  if (type === "addRule") {
    label = "Add rule";
  } else if (type == "addGroup") {
    label = "Add rule group";
  }
  return (
    <Button type="button" color="secondary" size="sm" disabled={readonly} onClick={onClick}>
      {label}
    </Button>
  );
}
