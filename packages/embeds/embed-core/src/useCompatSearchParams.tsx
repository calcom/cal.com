"use client";

import { ReadonlyURLSearchParams, useParams, useSearchParams } from "next/navigation";

export const useCompatSearchParams = () => {
  const _searchParams = useSearchParams() ?? new URLSearchParams();
  const params = useParams() ?? {};

  const searchParams = new URLSearchParams(_searchParams.toString());
  Object.getOwnPropertyNames(params).forEach((key) => {
    searchParams.delete(key);

    const param = params[key];
    const paramArr = typeof param === "string" ? param.split("/") : param;

    paramArr?.forEach((p) => {
      searchParams.append(key, p);
    });
  });

  return new ReadonlyURLSearchParams(searchParams);
};
