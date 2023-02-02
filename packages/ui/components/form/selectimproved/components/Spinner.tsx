import React, { useMemo } from "react";

import { COLORS, DEFAULT_THEME, THEME_DATA } from "../constants";

interface Props {
  primaryColor?: string;
}

const Spinner: React.FC<Props> = ({ primaryColor = DEFAULT_THEME }) => {
  const spinnerColor = useMemo(() => {
    if (COLORS.includes(primaryColor)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return THEME_DATA.text[primaryColor];
    }
    return THEME_DATA.text[DEFAULT_THEME];
  }, [primaryColor]);

  return (
    <svg
      className={`mr-0.5 h-5 w-5 animate-spin ${spinnerColor}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

export default Spinner;
