import type { ReactNode } from "react";

import { classNames } from "@calcom/lib";

import { CALCOM_ATOMS_WRAPPER_CLASS } from "../constants/styles";

export const AtomsWrapper = ({
  children,
  customClassName,
}: {
  children: ReactNode;
  customClassName?: string;
}) => {
  return (
    <div className={classNames(`${CALCOM_ATOMS_WRAPPER_CLASS} m-0 w-auto p-0`, customClassName)}>
      {children}
    </div>
  );
};
