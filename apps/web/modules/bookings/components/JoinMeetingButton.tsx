"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { BookingStatus } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Button, buttonClasses } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";
import { ChevronDownIcon } from "@coss/ui/icons";
import { useJoinableLocation } from "./useJoinableLocation";

interface JoinMeetingButtonProps {
  location: string | null;
  metadata?: unknown;
  bookingStatus: BookingStatus;
  size?: "sm" | "base" | "lg";
  color?: "primary" | "secondary" | "minimal" | "destructive";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  showCopyAction?: boolean;
}

export function JoinMeetingButton({
  location,
  metadata,
  bookingStatus,
  size = "base",
  color = "secondary",
  className,
  onClick,
  showCopyAction = false,
}: JoinMeetingButtonProps) {
  const { t } = useLocale();
  const { isJoinable, locationToDisplay, provider } = useJoinableLocation({
    location,
    metadata,
    bookingStatus,
    t,
  });

  if (!isJoinable || !locationToDisplay) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  const handleCopyLink = () => {
    void navigator.clipboard.writeText(locationToDisplay).then(() => {
      showToast(t("link_copied"), "success");
    });
  };

  const joinButton = (
    <Button
      color={color}
      size={size}
      href={locationToDisplay}
      target="_blank"
      rel="noopener noreferrer"
      className={classNames(
        "flex items-center gap-2",
        showCopyAction && "rounded-r-none border-r-0",
        className
      )}
      onClick={handleClick}>
      {provider?.iconUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={provider.iconUrl} className="h-4 w-4 shrink-0 rounded-sm" alt={`${provider.label} logo`} />
      )}
      {provider?.label ? t("join_event_location", { eventLocationType: provider.label }) : t("join_meeting")}
    </Button>
  );

  if (!showCopyAction) {
    return joinButton;
  }

  return (
    <div className="inline-flex">
      {joinButton}
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <button
            data-testid="join-meeting-copy-dropdown"
            className={buttonClasses({
              variant: "button",
              color,
              size,
              className: "rounded-l-none px-2",
            })}>
            <ChevronDownIcon className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <DropdownItem type="button" StartIcon="clipboard" onClick={handleCopyLink}>
              {t("copy_to_clipboard")}
            </DropdownItem>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </Dropdown>
    </div>
  );
}
