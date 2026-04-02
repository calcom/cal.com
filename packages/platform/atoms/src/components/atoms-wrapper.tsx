import classNames from "@calcom/ui/classNames";
import type { ReactNode } from "react";
import { useAtomsContext } from "../../hooks/useAtomsContext";
import { CALCOM_ATOMS_WRAPPER_CLASS } from "../constants/styles";

export const AtomsWrapper = ({
  children,
  customClassName,
}: {
  children: ReactNode;
  customClassName?: string;
}) => {
  const { options } = useAtomsContext();
  return (
    <div
      dir={options?.readingDirection ?? "ltr"}
      className={classNames(`${CALCOM_ATOMS_WRAPPER_CLASS} m-0 w-auto bg-transparent p-0`, customClassName)}>
      {children}
    </div>
  );
};
