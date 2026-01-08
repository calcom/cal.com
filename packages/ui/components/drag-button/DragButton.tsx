import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

import { Icon } from "../icon";

export type DragButtonProps = {
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
};

export function DragButton({ listeners, attributes }: DragButtonProps): JSX.Element {
  return (
    <button
      type="button"
      className="bg-default text-muted hover:text-emphasis border-default hover:border-emphasis invisible absolute left-0 -ml-4 hidden h-6 w-6 cursor-grab items-center justify-center rounded-md border p-1 group-hover:visible sm:-ml-8 sm:flex"
      {...listeners}
      {...attributes}>
      <Icon name="grip-vertical" className="h-5 w-5" />
    </button>
  );
}
