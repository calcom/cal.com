import React from "react";
import { useQuery } from "react-query";

import { HttpError } from "@lib/core/http/error";

const TestAsyncErrorRoute: React.FC = () => {
  const { error, isLoading } = useQuery(["error-promise"], async () => {
    throw new HttpError({
      statusCode: 400,
      message: "A http error occurred on the client side in test-async-error.tsx.",
      url: "http://awebsite.that.does.not.exist",
    });
  });

  if (isLoading) {
    return <>Loading...</>;
  }

  if (error) {
    console.log("An error occurred", error);
    throw error;
  }
  return <>If you see this message, there is really something wrong ;)</>;
};

export default TestAsyncErrorRoute;
