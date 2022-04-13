import { ChevronDownIcon, DotsHorizontalIcon } from "@heroicons/react/solid";
import React, { FC } from "react";

import Button from "@calcom/ui/Button";
import Dropdown, { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@calcom/ui/Dropdown";

import { SVGComponent } from "@lib/types/SVGComponent";

export type ActionType = {
  id: string;
  icon?: SVGComponent;
  label: string;
  disabled?: boolean;
  color?: "primary" | "secondary";
} & ({ href?: never; onClick: () => any } | { href?: string; onClick?: never }) & {
    actions?: ActionType[];
  };

interface Props {
  actions: ActionType[];
}

const DropdownActions = ({ actions, actionTrigger }: { actions: ActionType[]; actionTrigger?: any }) => {
  return (
    <Dropdown>
      {!actionTrigger ? (
        <DropdownMenuTrigger className="h-[38px] w-[38px] cursor-pointer rounded-sm border border-transparent text-neutral-500 hover:border-gray-300 hover:text-neutral-900">
          <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger asChild>{actionTrigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuContent portalled>
        {actions.map((action) => (
          <DropdownMenuItem key={action.id} className="focus-visible:outline-none">
            <Button
              type="button"
              size="sm"
              color="minimal"
              className="w-full rounded-none font-normal"
              href={action.href}
              StartIcon={action.icon}
              onClick={action.onClick}
              data-testid={action.id}>
              {action.label}
            </Button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </Dropdown>
  );
};

const TableActions: FC<Props> = ({ actions }) => {
  return (
    <>
      <div className="hidden space-x-2 rtl:space-x-reverse lg:block">
        {actions.map((action) => {
          const button = (
            <Button
              key={action.id}
              data-testid={action.id}
              href={action.href}
              onClick={action.onClick}
              StartIcon={action.icon}
              {...(action?.actions ? { EndIcon: ChevronDownIcon } : null)}
              disabled={action.disabled}
              color={action.color || "secondary"}>
              {action.label}
            </Button>
          );
          if (!action.actions) {
            return button;
          }

          return <DropdownActions key={action.id} actions={action.actions} actionTrigger={button} />;
        })}
      </div>
      <div className="inline-block text-left lg:hidden">
        <DropdownActions actions={actions} />
      </div>
    </>
  );
};

export default TableActions;
