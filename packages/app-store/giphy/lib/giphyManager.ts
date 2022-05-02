import { HttpError } from "@calcom/lib/http-error";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let api_key = "";

export const searchGiphy = async (locale: string, keyword: string, offset: number = 0) => {
  const appKeys = await getAppKeysFromSlug("giphy");
  if (typeof appKeys.api_key === "string") api_key = appKeys.api_key;
  if (!api_key) throw new HttpError({ statusCode: 400, message: "Missing Giphy api_key" });
  const queryParams = new URLSearchParams({
    api_key,
    q: keyword,
    limit: "1",
    offset: String(offset),
    // Contains images that are broadly accepted as appropriate and commonly witnessed by people in a public environment.
    rating: "g",
    lang: locale,
  });
  const response = await fetch(`https://api.giphy.com/v1/gifs/search?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const responseBody = await response.json();
  const gifs = responseBody.data;
  return gifs?.[0]?.images?.fixed_height_downsampled?.url || null;
};
