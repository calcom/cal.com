/**
 * Typescript class based component for custom-error
 * @link https://nextjs.org/docs/advanced-features/custom-error-page
 */
import type { NextPage, NextPageContext } from "next";
import type { ErrorProps } from "next/error";
import NextError from "next/error";
import React from "react";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";

import { ErrorPage } from "@components/error/error-page";

// Adds HttpException to the list of possible error types.
type AugmentedError = (NonNullable<NextPageContext["err"]> & HttpError) | null;
type CustomErrorProps = {
  err?: AugmentedError;
  message?: string;
  hasGetInitialPropsRun?: boolean;
} & Omit<ErrorProps, "err">;

type AugmentedNextPageContext = Omit<NextPageContext, "err"> & {
  err: AugmentedError;
};

const log = logger.getChildLogger({ prefix: ["[error]"] });

const CustomError: NextPage<CustomErrorProps> = (props) => {
  const { statusCode, err, message, hasGetInitialPropsRun } = props;

  if (!hasGetInitialPropsRun && err) {
    // getInitialProps is not called in case of
    // https://github.com/vercel/next.js/issues/8592. As a workaround, we pass
    // err via _app.tsx so it can be captured
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const e = getErrorFromUnknown(err);
    // can be captured here
    // e.g. Sentry.captureException(e);
  }
  return <ErrorPage statusCode={statusCode} error={err} message={message} />;
};

/**
 * Partially adapted from the example in
 * https://github.com/vercel/next.js/tree/canary/examples/with-sentry
 */
CustomError.getInitialProps = async (ctx: AugmentedNextPageContext) => {
  const { res, err, asPath } = ctx;
  const errorInitialProps = (await NextError.getInitialProps({
    res,
    err,
  } as NextPageContext)) as CustomErrorProps;

  // Workaround for https://github.com/vercel/next.js/issues/8592, mark when
  // getInitialProps has run
  errorInitialProps.hasGetInitialPropsRun = true;

  // If a HttpError message, let's override defaults
  if (err instanceof HttpError) {
    errorInitialProps.statusCode = err.statusCode;
    errorInitialProps.title = err.name;
    errorInitialProps.message = err.message;
    errorInitialProps.err = err;
  }

  if (res) {
    // Running on the server, the response object is available.
    //
    // Next.js will pass an err on the server if a page's `getInitialProps`
    // threw or returned a Promise that rejected

    // Overrides http status code if present in errorInitialProps
    res.statusCode = errorInitialProps.statusCode;

    log.debug(`server side logged this: ${err?.toString() ?? JSON.stringify(err)}`);
    log.info("return props, ", errorInitialProps);

    return errorInitialProps;
  } else {
    // Running on the client (browser).
    //
    // Next.js will provide an err if:
    //
    //  - a page's `getInitialProps` threw or returned a Promise that rejected
    //  - an exception was thrown somewhere in the React lifecycle (render,
    //    componentDidMount, etc) that was caught by Next.js's React Error
    //    Boundary. Read more about what types of exceptions are caught by Error
    //    Boundaries: https://reactjs.org/docs/error-boundaries.html
    if (err) {
      log.info("client side logged this", err);
      return errorInitialProps;
    }
  }

  // If this point is reached, getInitialProps was called without any
  // information about what the error might be. This is unexpected and may
  // indicate a bug introduced in Next.js
  new Error(`_error.tsx getInitialProps missing data at path: ${asPath}`);

  return errorInitialProps;
};

export default CustomError;
