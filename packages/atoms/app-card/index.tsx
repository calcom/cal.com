import type { UserAdminTeams } from "@calcom/ee/teams/lib/getUserAdminTeams";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";

type AppCardProps = {
  app: App;
  credentials?: Credential[];
  searchText?: string;
  userAdminTeams?: UserAdminTeams;
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
