type AppCardProps = {
  app: any;
  credentials?: any[];
  searchText?: string;
  userAdminTeams?: any;
};

export function AppCard({ app, credentials, searchText, userAdminTeams }: AppCardProps) {
  return (
    <div className="border-subtle relative flex h-64 flex-col rounded-md border p-5">
      <div className="flex">
        <img src={app.logo} alt={`${app.name} Logo`} />
      </div>
    </div>
  );
}
