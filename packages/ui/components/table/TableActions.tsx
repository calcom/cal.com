import type { FC } from "react";
import React from "react";

import type { IconName } from "../..";
import type { ButtonBaseProps } from "../button";
import { Button } from "../button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "../form/dropdown";

export type ActionType = {
  id: string;
  icon?: IconName;
  iconClassName?: string;
  label: string;
  disabled?: boolean;
  color?: ButtonBaseProps["color"];
  bookingId?: number;
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
          <Button type="button" color="secondary" variant="icon" StartIcon="ellipsis" />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger asChild>{actionTrigger}</DropdownMenuTrigger>
      )}
      <DropdownMenuPortal>
        <DropdownMenuContent>
          {actions.map((action) => (
            <DropdownMenuItem key={action.id}>
              <DropdownItem
                type="button"
                color={action.color}
                data-testid={action.id}
                StartIcon={action.icon}
                href={action.href}
                data-bookingid={action.bookingId}
                onClick={action.onClick || defaultAction}>
                {action.label}
              </DropdownItem>
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
              {...(action?.actions ? { EndIcon: "chevron-down" } : null)}
              disabled={action.disabled}
              data-bookingid={action.bookingId}
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
