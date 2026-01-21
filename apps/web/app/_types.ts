export type Params = {
  [param: string]: string | string[] | undefined;
};

export type SearchParams = {
  [param: string]: string | string[] | undefined;
};

export type PageProps = {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
};

export type LayoutProps = { params: Promise<Params>; children: React.ReactElement };

export type ReadonlyHeaders = Awaited<ReturnType<typeof import("next/headers").headers>>;
export type ReadonlyRequestCookies = Awaited<ReturnType<typeof import("next/headers").cookies>>;
