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

export { type ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
export { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
