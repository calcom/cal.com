type StringParams = {
  [param: string]: string;
};

export type MixedParams = {
  [param: string]: string | string[];
};

export type SearchParams = {
  [param: string]: string | string[] | undefined;
};

export type PageProps = {
  params: StringParams;
  searchParams: SearchParams;
};

export type LayoutProps = { params: StringParams; children: React.ReactElement };
export type TFunction = (
  key: string,
  options?: Record<string, string | number> // Interpolation variables
) => string;
