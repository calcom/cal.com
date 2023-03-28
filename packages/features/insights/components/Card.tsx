import { Card } from "@tremor/react";

import { classNames } from "@calcom/lib";

interface ICardProps {
  children: React.ReactNode;
  className?: string;
}

const CardInsights = (props: ICardProps) => {
  const { children, className = "", ...rest } = props;

  return (
    <Card className={classNames("shadow-none ring-gray-300", className)} {...rest}>
      {children}
    </Card>
  );
};

export { CardInsights };
