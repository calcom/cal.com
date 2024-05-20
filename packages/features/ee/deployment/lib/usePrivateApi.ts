import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import type { UseQueryOptions, UseMutationOptions } from "react-query";
import { useQuery } from "react-query";

import customAxios from "./createPrivateApiSignature";

export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await customAxios.get<T>(`${process.env.CALCOM_PRIVATE_API_ROUTE}/${url}`);
  return response.data;
};

export const poster = async <T>(url: string, data: any): Promise<T> => {
  const response = await customAxios.post<T>(`${process.env.CALCOM_PRIVATE_API_ROUTE}/${url}`, data);
  return response.data;
};

export const usePrivateApiFetch = <T>(key: string, url: string, options?: UseQueryOptions<T>) => {
  return useQuery<T>(key, () => fetcher<T>(url), options);
};

export const usePrivateApiPost = <T>(
  url: string,
  options?: Omit<UseMutationOptions<T, AxiosError, any, unknown>, "mutationFn">
) => {
  // @ts-expect-error i have no clue how to type this
  return useMutation<T, AxiosError, any, unknown>((data: any) => poster<T>(url, data), options);
};
