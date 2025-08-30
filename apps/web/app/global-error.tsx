"use client";

import * as Sentry from "@sentry/nextjs";
import { type NextPage } from "next";
import { useEffect } from "react";

import CustomError from "./error";
import type { ErrorProps } from "./error";

export const GlobalError: NextPage<ErrorProps> = (props) => {
  useEffect(() => {
    Sentry.captureException(props.error);
  }, [props.error]);
  return (
    <html>
      <body>
        <CustomError {...props} />
      </body>
    </html>
  );
};

export default GlobalError;
