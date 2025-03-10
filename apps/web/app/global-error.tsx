"use client";

import { type NextPage } from "next";

import CustomError from "./error";
import type { ErrorProps } from "./error";

export const GlobalError: NextPage<ErrorProps> = (props) => {
  return (
    <html>
      <body>
        <CustomError {...props} />
      </body>
    </html>
  );
};

export default GlobalError;
