import { Card } from "@tremor/react";

interface ICardProps {
  children: React.ReactNode;
  className?: string;
}

export const CardInsights = (props: ICardProps) => {
  const { children, className = "", ...rest } = props;

  return (
    <Card className={`shadow-none ring-gray-300 ${className}`} {...rest}>
      {children}
    </Card>
  );
};

