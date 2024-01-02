export type Params = {
  [param: string]: string | string[] | undefined;
};

export type SearchParams = {
  [param: string]: string | string[];
};

export type PageProps = {
  params: Params;
  searchParams: SearchParams;
};

export type LayoutProps = PageProps & { children: React.ReactElement };
