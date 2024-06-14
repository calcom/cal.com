import type { FC } from "react";
import React, { useState } from "react";

import { classNames } from "@calcom/lib";
import { getPlaceholderAvatar } from "@calcom/lib/defaultAvatarImage";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui";

type AccountSelectorProps = {
  avatar?: string;
  name: string;
  alreadyInstalled: boolean;
  onClick?: () => void;
  loading: boolean;
  testId: string;
};

const AccountSelector: FC<AccountSelectorProps> = ({
  avatar,
  alreadyInstalled,
  name,
  onClick,
  loading,
  testId,
}) => {
  const { t } = useLocale();
  const [selected, setSelected] = useState(false);
  return (
    <div
      className={classNames(
        "hover:bg-muted flex cursor-pointer flex-row items-center gap-2 p-1",
        (alreadyInstalled || loading) && "cursor-not-allowed",
        selected && loading && "bg-muted animate-pulse"
      )}
      data-testid={testId}
      onClick={() => {
        if (!alreadyInstalled && !loading && onClick) {
          setSelected(true);
          onClick();
        }
      }}>
      <Avatar
        alt={avatar || ""}
        imageSrc={getPlaceholderAvatar(avatar, name)} // if no image, use default avatar
        size="sm"
      />
      <div className="text-md pt-0.5 font-medium text-gray-500">
        {name}
        {alreadyInstalled ? <span className="ml-1 text-sm text-gray-400">{t("already_installed")}</span> : ""}
      </div>
    </div>
  );
};
export default AccountSelector;
