"use client";

import { type NextPage } from "next";

import CustomError, { type DefaultErrorProps } from "./error";

export const GlobalError: NextPage<DefaultErrorProps> = (props) => {
  return (
    <html>
      <body>
        <CustomError {...props} />
      </body>
    </html>
  );
};

export default GlobalError;
