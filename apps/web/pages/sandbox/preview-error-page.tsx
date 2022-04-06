import { NextPage } from "next";
import React from "react";

import { HttpError } from "@lib/core/http/error";

import { ErrorPage } from "@components/error/error-page";

const PreviewErrorPage: NextPage = () => {
  const statusCode = 403;
  const message = `this was an http error ${statusCode}`;
  const previousError = new Error("A test error");
  const error = new HttpError({
    statusCode,
    message,
    url: "http://some.invalid.url",
    cause: previousError,
  });
  return <ErrorPage displayDebug={true} statusCode={statusCode} error={error} message={message} />;
};

export default PreviewErrorPage;
