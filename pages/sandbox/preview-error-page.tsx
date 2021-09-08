import { NextPage } from "next";
import { ErrorPage } from "@components/error/error-page";
import React from "react";
import { HttpBadRequest } from "@lib/core/error/http";

const PreviewErrorPage: NextPage = () => {
  const statusCode = 403;
  const message = `this was an http error ${statusCode}`;
  const previousError = new Error("A test error");
  const error = new HttpBadRequest({
    url: "http://some.invalid.url",
    previousError,
    message,
  });
  return <ErrorPage displayDebug={true} statusCode={statusCode} error={error} message={message} />;
};

export default PreviewErrorPage;
