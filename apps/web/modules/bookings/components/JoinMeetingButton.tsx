"use client";

import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/i18n/useLocale";
import type { BookingStatus } from "@calcom/prisma/enums";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { showToast } from "@calcom/ui/components/toast";
import { Tooltip } from "@calcom/ui/components/tooltip";
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
  tooltip?: React.ReactNode;
}

export function JoinMeetingButton({
  location,
  metadata,
  bookingStatus,
  size = "base",
  color = "secondary",
  className,
  onClick,
  showCopyAction = true,
  tooltip,
}: JoinMeetingButtonProps) {
  const { t } = useLocale();
  const { copyToClipboard } = useCopy();
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
    copyToClipboard(locationToDisplay, {
      onSuccess: () => showToast(t("link_copied"), "success"),
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
      {provider?.label
        ? t("join_event_location", { eventLocationType: provider.label })
        : t("join_meeting")}
    </Button>
  );

  if (!showCopyAction) {
    return tooltip ? (
      <Tooltip content={tooltip}>
        <span>{joinButton}</span>
      </Tooltip>
    ) : (
      joinButton
    );
  }

  return (
    <div className="inline-flex">
      {tooltip ? (
        <Tooltip content={tooltip}>
          <span className="flex">{joinButton}</span>
        </Tooltip>
      ) : (
        joinButton
      )}
      <Dropdown>
        <DropdownMenuTrigger asChild>
          <Button
            data-testid="join-meeting-copy-dropdown"
            color={color}
            size={size}
            className="rounded-l-none px-2">
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
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
