import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

import { Icon } from "../icon";

export type DragButtonProps = {
  listeners?: SyntheticListenerMap;
  attributes?: Record<string, unknown>;
};

export function DragButton({ listeners, attributes }: DragButtonProps) {
  return (
    <button
      type="button"
      className="bg-default text-muted hover:text-emphasis border-default hover:border-emphasis invisible absolute left-0 -ml-4 hidden h-6 w-6 cursor-grab items-center justify-center rounded-md border p-1 transition-all group-hover:visible sm:ml-0 sm:flex lg:left-3"
      {...listeners}
      {...attributes}>
      <Icon name="grip-vertical" className="h-5 w-5" />
    </button>
  );
}
