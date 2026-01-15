import type { FC, ReactNode } from "react";

type StepHeaderProps = {
  children?: ReactNode;
  title: string;
  subtitle: string;
};
export const StepHeader: FC<StepHeaderProps> = ({ children, title, subtitle }) => {
  return (
    <div>
      <header>
        <p className="font-cal mb-3 text-[28px] font-medium capitalize leading-7">{title}</p>

        <p className="text-subtle font-sans text-sm font-normal">{subtitle}</p>
      </header>
      {children}
    </div>
  );
};
