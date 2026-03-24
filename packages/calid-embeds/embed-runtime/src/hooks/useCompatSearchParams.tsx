"use client";
import { ReadonlyURLSearchParams, useParams, useSearchParams } from "next/navigation";

export const useCompatSearchParams = () => {
  const baseParams = useSearchParams() ?? new URLSearchParams();
  const dynamicParams = useParams() ?? {};
  const result = new URLSearchParams(baseParams.toString());

  Object.getOwnPropertyNames(dynamicParams).forEach((key) => {
    result.delete(key);
    const val = dynamicParams[key];
    const entries = typeof val === "string" ? val.split("/") : val;
    entries?.forEach((entry) => result.append(key, entry));
  });

  return new ReadonlyURLSearchParams(result);
};

