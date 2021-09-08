import React from "react";
import { HttpException } from "@lib/core/error/http";
import { useQuery } from "react-query";

const TestAsyncErrorRoute: React.FC = () => {
  const { error, isLoading } = useQuery(["error-promise"], async () => {
    throw new HttpException({
      status: 400,
      message: "An http error occurred on the client side in test-async-error.tsx.",
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
