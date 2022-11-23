import React, { FC } from "react";

import {
  Button,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  Icon,
} from "@calcom/ui";

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
        <DropdownMenuTrigger asChild>
          <Button type="button" color="secondary" size="icon" StartIcon={Icon.FiMoreHorizontal} />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger asChild>{actionTrigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuPortal>
        <DropdownMenuContent>
          {actions.map((action) => (
            <DropdownMenuItem key={action.id} className="focus-visible:outline-none">
              <Button
                type="button"
                color="minimal"
                className="w-full rounded-none font-normal"
                href={action.href}
                StartIcon={action.icon}
                onClick={action.onClick || defaultAction}
                data-testid={action.id}>
                {action.label}
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
};

const TableActions: FC<Props> = ({ actions }) => {
  return (
    <>
      <div className="flex space-x-2 rtl:space-x-reverse">
        {actions.map((action) => {
          const button = (
            <Button
              className="whitespace-nowrap"
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
    </>
  );
};

export default TableActions;
