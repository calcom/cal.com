export type Params = {
  [param: string]: string;
};

export type MixedParams = {
  [param: string]: string | string[];
};

export type SearchParams = {
  [param: string]: string | string[] | undefined;
};

export type PageProps = {
  params: Params;
  searchParams: SearchParams;
};

export type LayoutProps = { params: Params; children: React.ReactElement };
export type TFunction = (
  key: string,
  options?: Record<string, string | number> // Interpolation variables
) => string;
