export const searchGiphy = async (locale: string, keyword: string, offset: number = 0) => {
  const queryParams = new URLSearchParams({
    api_key: String(process.env.GIPHY_API_KEY),
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
