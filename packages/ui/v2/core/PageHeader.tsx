import { ReactNode } from "react";

import { Badge, BadgeProps } from "../../components/badge";

type Props = {
  title: string;
  description?: string;
  badgeText?: string;
  badgeVariant?: BadgeProps["variant"];
  infoIcon?: string;
  rightAlignedComponent?: ReactNode;
};

function PageHeader({ title, description, rightAlignedComponent, badgeText, badgeVariant }: Props) {
  return (
    <div className="flex items-center">
      <div className="mr-4 flex-col">
        <div className="flex w-full items-center space-x-2 rtl:space-x-reverse">
          <h1 className="font-cal text-xl font-semibold text-black">{title}</h1>
          {badgeText && badgeVariant && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        </div>
        <h2 className="text-sm text-gray-600">{description}</h2>
      </div>
      <div className="ml-auto ">{rightAlignedComponent && rightAlignedComponent}</div>
    </div>
  );
}

export default PageHeader;
