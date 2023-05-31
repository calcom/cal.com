import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useState } from "react";

import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
import { classNames } from "@calcom/lib";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar } from "@calcom/ui";
import { Layers, User, Check } from "@calcom/ui/components/icon";

export const WorkflowDropdownFilter = () => {
  const { t } = useLocale();
  const session = useSession();

  const [dropdownTitle, setDropdownTitle] = useState<string>(t("all_apps"));
  const { data: query, pushItemToKey, removeItemByKeyAndValue, removeAllQueryParams } = useFilterQuery();
  const { data: teams } = trpc.viewer.teams.list.useQuery();

  return (
    <AnimatedPopover text={dropdownTitle}>
      <div className="ml-2 flex flex-col gap-0.5 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1">
        <DropdownItemContainer
          isSelected={dropdownTitle === t("all_apps")}
          icon={<Layers className="h-4 w-4" />}
          onClick={() => {
            setDropdownTitle(t("all_apps"));
            removeAllQueryParams();
          }}>
          <TextContainer>{t("all_apps")}</TextContainer>
        </DropdownItemContainer>
        <DropdownItemContainer
          isSelected={dropdownTitle === t("yours")}
          icon={<User className="h-4 w-4" />}
          onClick={() => {
            setDropdownTitle(t("yours"));
            pushItemToKey("userIds", session.data?.user.id || 0);
          }}>
          <TextContainer>{t("yours")}</TextContainer>
        </DropdownItemContainer>

        {teams?.map((team, idx) => (
          <DropdownItemContainer
            key={idx}
            isSelected={dropdownTitle === team.name}
            onClick={() => {
              setDropdownTitle(team.name);
              pushItemToKey("teamIds", team.id);
            }}
            icon={
              <Avatar
                alt={team?.name}
                imageSrc={getPlaceholderAvatar(team.logo, team?.name as string)}
                size="xs"
              />
            }>
            <TextContainer>{team.name}</TextContainer>
          </DropdownItemContainer>
        ))}
      </div>
    </AnimatedPopover>
  );
};

const ImageContainer = ({ children }: { children: ReactNode }) => {
  return <div className="text-default flex items-center justify-center ltr:mr-2 rtl:ml-2">{children}</div>;
};

const DropdownItemContainer = ({
  children,
  icon,
  onClick,
  isSelected,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
  isSelected: boolean;
}) => {
  return (
    <div
      role="button"
      onClick={onClick}
      className={classNames(
        "item-center focus-within:bg-subtle hover:bg-muted flex rounded-md py-2.5 pl-4 pr-2 hover:cursor-pointer",
        isSelected && "bg-emphasis hover:bg-emphasis"
      )}>
      <ImageContainer>{icon}</ImageContainer>
      <div className="flex w-full items-center justify-between">
        {children}
        {isSelected && <Check className="h-4 w-4" />}
      </div>
    </div>
  );
};

const TextContainer = ({ children }: { children: string }) => {
  return <div className="text-default truncate text-sm font-medium">{children}</div>;
};
