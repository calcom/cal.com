import { useSession } from "next-auth/react";
import { useState } from "react";

import { ENABLE_PROFILE_SWITCHER } from "@calcom/lib/constants";
import { useRefreshData } from "@calcom/lib/hooks/useRefreshData";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import classNames from "@calcom/ui/classNames";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { Icon } from "@calcom/ui/components/icon";

export function ProfileDropdown() {
  const { update, data: sessionData } = useSession();
  const { data } = trpc.viewer.me.get.useQuery();
  const [menuOpen, setMenuOpen] = useState(false);
  const refreshData = useRefreshData();

  if (!data || !ENABLE_PROFILE_SWITCHER || !sessionData) {
    return null;
  }
  const options = data.profiles.map((profile) => {
    let label;
    if (profile.organization) {
      label = profile.organization.name;
    } else {
      label = sessionData.user.name;
    }

    return {
      label,
      value: profile.upId,
    };
  });

  const currentOption = options.find((option) => option.value === sessionData.upId) || options[0];

  return (
    <Dropdown open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="user-dropdown-trigger-button"
          className={classNames(
            "hover:bg-emphasis todesktop:!bg-transparent group mx-0 flex w-full cursor-pointer appearance-none items-center rounded-full px-2 py-1.5 text-left outline-none transition focus:outline-none focus:ring-0 md:rounded-none lg:rounded"
          )}>
          <span className="flex w-full grow items-center justify-around gap-2 text-sm font-medium leading-none">
            <Avatar alt={currentOption.label || ""} size="xsm" />
            <span className="block w-20 overflow-hidden text-ellipsis whitespace-nowrap">
              {currentOption.label}
            </span>
            <Icon
              name={menuOpen ? "chevron-up" : "chevron-down"}
              className="group-hover:text-subtle text-muted h-4 w-4 shrink-0 transition rtl:mr-4"
              aria-hidden="true"
            />
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuPortal>
        <DropdownMenuContent
          align="start"
          onInteractOutside={() => {
            setMenuOpen(false);
          }}
          className="min-w-56 hariom group overflow-hidden rounded-md">
          <DropdownMenuItem className="p-3 uppercase">
            <span>Switch to</span>
          </DropdownMenuItem>
          {options.map((option) => {
            const isSelected = currentOption.value === option.value;
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  setMenuOpen(false);
                  if (isSelected) return;
                  update({
                    upId: option.value,
                  }).then(() => {
                    refreshData();
                  });
                }}
                className={classNames("flex w-full", isSelected ? "bg-subtle text-emphasis" : "")}>
                <DropdownItem
                  type="button"
                  childrenClassName={classNames("flex w-full justify-between items-center")}>
                  <span>
                    <Avatar alt={option.label || ""} size="xsm" />
                    <span className="ml-2">{option.label}</span>
                  </span>
                  {isSelected ? (
                    <Icon name="check" className="ml-2 inline h-4 w-4" aria-hidden="true" />
                  ) : null}
                </DropdownItem>
              </DropdownMenuItem>
            );
          })}

          {/* <DropdownMenuSeparator /> */}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </Dropdown>
  );
}
