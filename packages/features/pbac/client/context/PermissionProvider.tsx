export function PermissionProvider({ children }: { children: React.ReactNode }) {
  // const { data: permissions, isLoading } = trpc.viewer.pbac.getUserPermissions.useQuery(undefined, {
  //   // Since permissions don't change often, we can cache them for a while
  //   staleTime: 5 * 60 * 1000, // 5 minutes
  // });

  // const setTeamPermissions = usePermissionStore((state) => state.setTeamPermissions);

  // useEffect(() => {
  //   if (permissions) {
  //     setTeamPermissions(permissions);
  //   }
  // }, [permissions, setTeamPermissions]);

  // if (true) {
  //   return null;
  // }

  return <>{children}</>;
}
