import type { ReactNode } from "react";

import { CALCOM_ATOMS_WRAPPER_CLASS } from "../constants/styles";

export const AtomsWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div
      className={`${CALCOM_ATOMS_WRAPPER_CLASS} m-0 w-auto bg-transparent p-0`}
      style={{ margin: 0, padding: 0, backgroundColor: "transparent" }}>
      {children}
    </div>
  );
};
