export function FilterResults({
  queryRes,
  SkeletonLoader,
  noResultsScreen,
  emptyScreen,
  children,
}: {
  queryRes: { isPending: boolean; data: { totalCount: number; filtered: unknown[] } | undefined };
  SkeletonLoader: React.FC;
  noResultsScreen: React.ReactNode;
  emptyScreen: React.ReactNode;
  children: React.ReactNode;
}) {
  if (queryRes.isPending) return <SkeletonLoader />;
  if (!queryRes.data?.totalCount) return <>{emptyScreen}</>;

  return queryRes.data?.totalCount ? (
    <div>{queryRes.data?.filtered.length ? children : noResultsScreen}</div>
  ) : null;
}
