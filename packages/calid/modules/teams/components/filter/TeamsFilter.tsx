"use client";

import { cn } from "@calid/features/lib/cn";
import { getDefaultAvatar } from "@calid/features/lib/defaultAvatar";
import { Avatar } from "@calid/features/ui/components/avatar";
import { Icon } from "@calid/features/ui/components/icon";
import { Tooltip } from "@calid/features/ui/components/tooltip";
import { useSession } from "next-auth/react";
import { forwardRef, useMemo, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import classNames from "@calcom/ui/classNames";
import { FilterSearchField } from "@calcom/ui/components/form";
import { AnimatedPopover } from "@calcom/ui/components/popover";

interface TeamsFilterProps {
  selectedTeamIds?: number[];
  selectedUserId?: number | null;
  onTeamChange?: (teamIds: number[]) => void;
  onUserChange?: (userId: number | null) => void;
  onAllChange?: () => void;
  className?: string;
  showVerticalDivider?: boolean;
  popoverTriggerClassNames?: string;
}

export const FilterCheckboxFieldsContainer = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={classNames(
        "bg-muted flex flex-col gap-0.5 p-2 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1",
        className
      )}>
      {children}
    </div>
  );
};

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  testId?: string;
  icon?: ReactNode;
};

export const FilterCheckboxField = forwardRef<HTMLInputElement, Props>(
  ({ label, icon, testId, ...rest }, ref) => {
    return (
      <div
        data-testid={testId}
        className="hover:bg-emphasis flex items-center rounded-md py-2 pl-3 pr-2.5 transition hover:cursor-pointer">
        <label className="flex w-full max-w-full items-center justify-between hover:cursor-pointer">
          <div className="flex items-center truncate">
            {icon && (
              <div className="text-default flex h-4 w-4 items-center justify-center ltr:mr-2 rtl:ml-2">
                {icon}
              </div>
            )}
            <Tooltip content={label}>
              <label
                htmlFor={rest.id}
                className="text-default me-1 cursor-pointer truncate text-sm font-medium">
                {label}
              </label>
            </Tooltip>
          </div>
          <div className="flex h-5 items-center">
            <input
              {...rest}
              ref={ref}
              type="checkbox"
              className="text-emphasis dark:text-muted focus:ring-emphasis border-default bg-default h-4 w-4 rounded transition hover:cursor-pointer"
            />
          </div>
        </label>
      </div>
    );
  }
);

FilterCheckboxField.displayName = "FilterCheckboxField";

export function TeamsFilter({
  selectedTeamIds = [],
  selectedUserId = null,
  onTeamChange,
  onUserChange,
  onAllChange,
  className,
  showVerticalDivider = false,
  popoverTriggerClassNames,
}: TeamsFilterProps) {
  const { t } = useLocale();
  const session = useSession();
  const [search, setSearch] = useState("");

  const { data: teams, isLoading } = trpc.viewer.calidTeams.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const userId = session.data?.user?.id || 0;
  const userName = session.data?.user?.name || "";
  const userAvatar = session.data?.user?.image || "";

  const regularTeams = useMemo(() => {
    return teams?.filter((team) => team.acceptedInvitation) || [];
  }, [teams]);

  const getCheckedOptionsNames = () => {
    const checkedOptions: string[] = [];
    if (selectedTeamIds.length > 0) {
      const selectedTeamsNames = regularTeams
        .filter((team) => selectedTeamIds.includes(team.id))
        .map((team) => team.name);
      checkedOptions.push(...selectedTeamsNames);
      return `${checkedOptions.join(",")}`;
    }
    if (selectedUserId) {
      return t("yours");
    }
    return t("all");
  };

  const handleAllClick = () => {
    onAllChange?.();
  };

  const handleUserClick = () => {
    if (selectedUserId) {
      onUserChange?.(null);
    } else {
      onUserChange?.(userId);
    }
  };

  const handleTeamClick = (teamId: number) => {
    if (selectedTeamIds.includes(teamId)) {
      onTeamChange?.(selectedTeamIds.filter((id) => id !== teamId));
    } else {
      onTeamChange?.([...selectedTeamIds, teamId]);
    }
  };

  const isAllSelected = selectedTeamIds.length === 0 && !selectedUserId;
  const isUserSelected = !!selectedUserId;

  if (isLoading) {
    return (
      <div className={cn("flex items-center", className)}>
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
        {showVerticalDivider && <div className="mx-2 h-4 w-px bg-gray-300" />}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", className)}>
      <AnimatedPopover
        text={getCheckedOptionsNames()}
        popoverTriggerClassNames={popoverTriggerClassNames}
        prefix={`${t("teams")}: `}>
        <FilterCheckboxFieldsContainer>
          <FilterSearchField
            placeholder={t("search")}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />

          <FilterCheckboxField
            id="all"
            icon={<Icon name="layers" className="h-4 w-4" />}
            checked={isAllSelected}
            onChange={() => handleAllClick()}
            label={t("all")}
          />

          <FilterCheckboxField
            id="yours"
            icon={<Avatar imageSrc={getDefaultAvatar(userAvatar, userName)} alt={userName} size="xs" />}
            checked={isUserSelected}
            onChange={() => handleUserClick()}
            label={t("yours")}
          />

          {regularTeams
            .filter((team) => team.name.toLowerCase().includes(search.toLowerCase()))
            .map((team) => (
              <FilterCheckboxField
                key={team.id}
                id={team.name}
                label={team.name}
                checked={selectedTeamIds.includes(team.id)}
                onChange={() => handleTeamClick(team.id)}
                icon={
                  <Avatar
                    imageSrc={getDefaultAvatar(team.logoUrl, team.name)}
                    alt={team.name || ""}
                    size="xs"
                  />
                }
              />
            ))}
        </FilterCheckboxFieldsContainer>
      </AnimatedPopover>
      {showVerticalDivider && <div className="mx-2 h-4 w-px bg-gray-300" />}
    </div>
  );
}
