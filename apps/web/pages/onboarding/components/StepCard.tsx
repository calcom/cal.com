import { ReactElement } from "react";

const StepCard: React.PropsWithChildren<ReactElement> = ({ children }: { children: ReactElement }) => {
  return <div className="rounded-md border-gray-200 p-10">{children}</div>;
};

export { StepCard };
