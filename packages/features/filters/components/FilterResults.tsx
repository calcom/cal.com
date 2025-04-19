export function FilterResults({
  queryRes,
  noResultsScreen,
  emptyScreen,
  children,
}: {
  queryRes: { data: { totalCount: number; filtered: unknown[] } | undefined };
  noResultsScreen: React.ReactNode;
  emptyScreen: React.ReactNode;
  children: React.ReactNode;
}) {
  if (!queryRes.data?.totalCount) return <>{emptyScreen}</>;

  return queryRes.data?.totalCount ? (
    <div>{queryRes.data?.filtered.length ? children : noResultsScreen}</div>
  ) : null;
}
