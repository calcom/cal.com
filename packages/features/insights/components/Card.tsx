import { Card } from "@tremor/react";

import classNames from "@calcom/ui/classNames";

interface ICardProps {
  children: React.ReactNode;
  className?: string;
}

export const CardInsights = (props: ICardProps) => {
  const { children, className = "", ...rest } = props;

  return (
    <Card className={classNames(`ring-subtle bg-muted shadow-none `, className)} {...rest}>
      {children}
    </Card>
  );
};
