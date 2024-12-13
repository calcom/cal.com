import type { ReactNode } from "react";

import { classNames } from "@calcom/lib";

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
      className={classNames(`${CALCOM_ATOMS_WRAPPER_CLASS} m-0 w-auto p-0`, customClassName)}>
      {children}
    </div>
  );
};
