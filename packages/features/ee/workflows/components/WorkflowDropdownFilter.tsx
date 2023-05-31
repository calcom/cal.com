import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useState } from "react";

import { useFilterQuery } from "@calcom/features/bookings/lib/useFilterQuery";
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
      <div className="mx-2 [&>*:first-child]:mt-1 [&>*:last-child]:mb-1">
        <DropdownItemContainer
          icon={<Layers className="h-4 w-4" />}
          onClick={() => {
            setDropdownTitle(t("all_apps"));
            removeAllQueryParams();
          }}>
          <TextContainer>{t("all_apps")}</TextContainer>
          {dropdownTitle === t("all_apps") && <Check className="h-4 w-4" />}
        </DropdownItemContainer>
        <DropdownItemContainer
          icon={<User className="h-4 w-4" />}
          onClick={() => {
            setDropdownTitle(t("yours"));
            pushItemToKey("userIds", session.data?.user.id || 0);
          }}>
          <TextContainer>{t("yours")}</TextContainer>
          {dropdownTitle === t("yours") && <Check className="h-4 w-4" />}
        </DropdownItemContainer>

        {teams?.map((team, idx) => (
          <DropdownItemContainer
            key={idx}
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
            {dropdownTitle === team.name && <Check className="h-4 w-4" />}
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
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) => {
  return (
    <div
      role="button"
      onClick={onClick}
      className="item-center focus-within:bg-subtle hover:bg-muted flex rounded-md py-[6px] pl-4 pr-2 hover:cursor-pointer">
      <ImageContainer>{icon}</ImageContainer>
      <div className="flex w-full items-center justify-between">{children}</div>
    </div>
  );
};

const TextContainer = ({ children }: { children: string }) => {
  return <div className="text-default truncate text-sm font-medium">{children}</div>;
};
