// returns query object same as ctx.query but for app dir
export const getQuery = (url: string, params: Record<string, string | string[]>) => {
  if (!url.length) {
    return params;
  }

  const { searchParams } = new URL(url);
  const searchParamsObj = Object.fromEntries(searchParams.entries());

  return { ...searchParamsObj, ...params };
};
