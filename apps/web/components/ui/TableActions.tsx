import { DotsHorizontalIcon } from "@heroicons/react/solid";
import React, { FC } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import Button from "@calcom/ui/Button";
import Dropdown, { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@calcom/ui/Dropdown";

import { SVGComponent } from "@lib/types/SVGComponent";

export type ActionType = {
  id: string;
  icon: SVGComponent;
  label: string;
  disabled?: boolean;
  color?: "primary" | "secondary";
} & ({ href?: never; onClick: () => any } | { href: string; onClick?: never });

interface Props {
  actions: ActionType[];
}

const TableActions: FC<Props> = ({ actions }) => {
  const { t } = useLocale();
  return (
    <>
      <div className="hidden space-x-2 rtl:space-x-reverse lg:block">
        {actions.map((action) => (
          <Button
            key={action.id}
            data-testid={action.id}
            href={action.href}
            onClick={action.onClick}
            StartIcon={action.icon}
            disabled={action.disabled}
            color={action.color || "secondary"}>
            {action.label}
          </Button>
        ))}
      </div>
      <div className="inline-block text-left lg:hidden">
        <Dropdown>
          <DropdownMenuTrigger className="h-[38px] w-[38px] cursor-pointer rounded-sm border border-transparent text-neutral-500 hover:border-gray-300 hover:text-neutral-900">
            <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
          </DropdownMenuTrigger>
          <DropdownMenuContent portalled>
            {actions.map((action) => (
              <DropdownMenuItem key={action.id}>
                <Button
                  type="button"
                  size="lg"
                  color="minimal"
                  className="w-full rounded-none font-normal"
                  href={action.href}
                  StartIcon={action.icon}
                  onClick={action.onClick}>
                  {action.label}
                </Button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      </div>
    </>
  );
};

export default TableActions;
