import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

import { doesAppSupportTeamInstall } from "@calcom/app-store/utils";
import type { UserAdminTeams } from "@calcom/ee/teams/lib/getUserAdminTeams";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import type { CredentialFrontendPayload as Credential } from "@calcom/types/Credential";

type CardProps = {
  app: App;
  credentials?: Credential[];
  searchText?: string;
  userAdminTeams?: UserAdminTeams;
};

export function Card({ app, credentials, searchText, userAdminTeams }: CardProps) {
  const enabledOnTeams = doesAppSupportTeamInstall(app.categories, app.concurrentMeetings);
  const appAdded = (credentials && credentials.length) || 0;

  const appInstalled = enabledOnTeams && userAdminTeams ? userAdminTeams.length < appAdded : appAdded > 0;

  const [searchTextIndex, setSearchTextIndex] = useState<number | undefined>(undefined);

  useEffect(() => {
    setSearchTextIndex(searchText ? app.name.toLowerCase().indexOf(searchText.toLowerCase()) : undefined);
  }, [app.name, searchText]);

  return (
    <div className="border-subtle relative flex h-64 flex-col rounded-md border p-5">
      <div className="flex">
        <img
          src={app.logo}
          alt={`${app.name} Logo`}
          className={cn(app.logo.includes("-dark") && "dark:invert", "mb-4 h-12 w-12 rounded-sm")}
        />
      </div>
      <div className="flex items-center">
        <h3 className="text-emphasis font-medium">
          {searchTextIndex != undefined && searchText ? (
            <>
              {app.name.substring(0, searchTextIndex)}
              <span className="bg-yellow-300" data-testid="highlighted-text">
                {app.name.substring(searchTextIndex, searchTextIndex + searchText.length)}
              </span>
              {app.name.substring(searchTextIndex + searchText.length)}
            </>
          ) : (
            app.name
          )}
        </h3>
      </div>
      <p
        className="text-default mt-2 flex-grow text-sm"
        style={{
          overflow: "hidden",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: "3",
        }}>
        {app.description}
      </p>
      <div className="mt-5 flex max-w-full flex-row justify-between gap-2">
        <Button
          color="secondary"
          className="flex w-32 flex-grow justify-center"
          data-testid={`app-store-app-card-${app.slug}`}>
          <a href={`/apps/${app.slug}`}>Details</a>
        </Button>
        {}
      </div>
      <div className="max-w-44 absolute right-0 mr-4 flex flex-wrap justify-end gap-1">
        {appInstalled ? (
          <Badge variant="default" className="bg-green-200 text-white">
            Installed
          </Badge>
        ) : null}
        {app.isTemplate && (
          <span className="bg-error rounded-md px-2 py-1 text-sm font-normal text-red-800">Template</span>
        )}
        {(app.isDefault || (!app.isDefault && app.isGlobal)) && (
          <span className="bg-subtle text-emphasis flex items-center rounded-md px-2 py-1 text-sm font-normal">
            Default
          </span>
        )}
      </div>
    </div>
  );
}
