import React, { FC } from "react";
import { IconType } from "react-icons/lib";

import {
  Button,
  Dropdown,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  ButtonBaseProps,
  Icon,
} from "@calcom/ui";

export type ActionType = {
  id: string;
  icon?: IconType;
  iconClassName?: string;
  label: string;
  disabled?: boolean;
  color?: ButtonBaseProps["color"];
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

export const DropdownActions = ({
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
            <DropdownMenuItem key={action.id}>
              <Button
                type="button"
                color={action.color || "minimal"}
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

export const TableActions: FC<Props> = ({ actions }) => {
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
