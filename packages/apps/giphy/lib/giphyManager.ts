import { HttpError } from "@calcom/lib/http-error";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let api_key = "";

const checkGiphyApiKey = async () => {
  const appKeys = await getAppKeysFromSlug("giphy");
  if (typeof appKeys.api_key === "string") api_key = appKeys.api_key;
  if (!api_key) throw new HttpError({ statusCode: 400, message: "Missing Giphy api_key" });
};

export const searchGiphy = async (locale: string, keyword: string, offset = 0) => {
  await checkGiphyApiKey();
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
  return {
    gifImageUrl: gifs?.[0]?.images?.fixed_height_downsampled?.url || null,
    total: responseBody.pagination.total_count,
  };
};

export const getGiphyById = async (giphyId: string) => {
  await checkGiphyApiKey();
  const queryParams = new URLSearchParams({
    api_key,
  });
  const response = await fetch(`https://api.giphy.com/v1/gifs/${giphyId}?${queryParams.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const responseBody = await response.json();
  const gifs = responseBody.data;
  return gifs?.images?.fixed_height_downsampled?.url || null;
};
