import { ChevronDownIcon } from "@heroicons/react/solid";
import React from "react";

import { Button } from "@calcom/ui";
import Dropdown, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@calcom/ui/Dropdown";

import Avatar from "@components/ui/Avatar";

export const CreateEventTypeBtn = (props: {}) => {
  return (
    <>
      {!hasTeams || props.isIndividualTeam ? (
        <Button
          onClick={() => openModal(props.options[0])}
          data-testid="new-event-type"
          StartIcon={PlusIcon}
          disabled={!props.canAddEvents}>
          {t("new_event_type_btn")}
        </Button>
      ) : (
        <Dropdown>
          <DropdownMenuTrigger asChild>
            <Button EndIcon={ChevronDownIcon}>{t("new_event_type_btn")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("new_event_subtitle")}</DropdownMenuLabel>
            <DropdownMenuSeparator className="h-px bg-gray-200" />
            {props.options.map((option) => (
              <DropdownMenuItem
                key={option.slug}
                className="cursor-pointer px-3 py-2 hover:bg-neutral-100 focus:outline-none"
                onSelect={() => openModal(option)}>
                <Avatar
                  alt={option.name || ""}
                  imageSrc={option.image}
                  size={6}
                  className="inline ltr:mr-2 rtl:ml-2"
                />
                {option.name ? option.name : option.slug}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </Dropdown>
      )}
    </>
  );
};
