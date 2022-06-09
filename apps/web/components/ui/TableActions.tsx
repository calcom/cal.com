import { ChevronDownIcon, DotsHorizontalIcon } from "@heroicons/react/solid";
import React, { FC } from "react";

import Button from "@calcom/ui/Button";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";

import { SVGComponent } from "@lib/types/SVGComponent";

export type ActionType = {
  id: string;
  icon?: SVGComponent;
  iconClassName?: string;
  label: string;
  disabled?: boolean;
  color?: "primary" | "secondary";
} & (
  | { href: string; onClick?: never; actions?: never }
  | { href?: never; onClick: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void; actions?: never }
  | { actions?: ActionType[]; href?: never; onClick?: never }
);

interface Props {
  actions: ActionType[];
}

const defaultAction = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
  e.stopPropagation();
};

const DropdownActions = ({
  actions,
  actionTrigger,
}: {
  actions: ActionType[];
  actionTrigger?: React.ReactNode;
}) => {
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
              startIconClassName={action.iconClassName}
              onClick={action.onClick || defaultAction}
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
  const mobileActions = actions.flatMap((action) => {
    if (action.actions) {
      return action.actions;
    }
    return action;
  });
  return (
    <>
      <div className="hidden space-x-2 rtl:space-x-reverse lg:block">
        {actions.map((action) => {
          const button = (
            <Button
              key={action.id}
              data-testid={action.id}
              href={action.href}
              onClick={action.onClick || defaultAction}
              StartIcon={action.icon}
              startIconClassName={action.iconClassName}
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
        <DropdownActions actions={mobileActions} />
      </div>
    </>
  );
};

export default TableActions;
