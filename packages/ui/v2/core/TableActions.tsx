import React, { FC } from "react";

import { SVGComponent } from "@calcom/types/SVGComponent";
import { Icon } from "@calcom/ui/Icon";
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Button } from "@calcom/ui/v2";
import Dropdown from "@calcom/ui/v2/core/Dropdown";

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
        <DropdownMenuTrigger asChild>
          <Button type="button" color="minimal" size="icon" StartIcon={Icon.FiMoreHorizontal} />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger asChild className="">
          {actionTrigger}
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent portalled>
        {actions.map((action) => (
          <DropdownMenuItem key={action.id} className="focus-visible:outline-none">
            <Button
              type="button"
              color="minimal"
              href={action.href}
              StartIcon={action.icon}
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
      <div className="hidden flex-row items-center space-x-2 rtl:space-x-reverse md:flex md:flex-row md:items-center">
        {actions.map((action) => {
          const button = (
            <Button
              key={action.id}
              data-testid={action.id}
              href={action.href}
              onClick={action.onClick || defaultAction}
              StartIcon={action.icon}
              {...(action?.actions ? { EndIcon: Icon.FiChevronDown } : null)}
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
      <div className="inline-block text-left md:hidden">
        <DropdownActions actions={mobileActions} />
      </div>
    </>
  );
};

export default TableActions;
