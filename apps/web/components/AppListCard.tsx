import { ReactNode } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge, ListItemText } from "@calcom/ui";

interface AppListCardProps {
  logo?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  isDefault?: boolean;
}

export default function AppListCard(props: AppListCardProps) {
  const { t } = useLocale();
  const { logo, title, description, actions, isDefault } = props;

  return (
    <div className="p-4">
      <div className="flex items-center gap-x-3">
        {logo ? <img className="h-10 w-10" src={logo} alt={`${title} logo`} /> : null}

        <div className="flex grow flex-col gap-y-1 truncate">
          <div className="flex items-center gap-x-2">
            <h3 className="truncate text-sm font-semibold text-gray-900">{title}</h3>
            {isDefault ? <Badge variant="green">{t("default")}</Badge> : null}
          </div>
          <ListItemText component="p">{description}</ListItemText>
        </div>

        {actions}
      </div>
    </div>
  );
}
