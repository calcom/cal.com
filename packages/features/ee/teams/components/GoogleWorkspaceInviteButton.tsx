import { useRouter } from "next/router";
import { useState } from "react";
import type { PropsWithChildren } from "react";

import { trpc } from "@calcom/trpc";
import { Button, Tooltip } from "@calcom/ui";

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clip-path="url(#clip0_4178_176214)">
      <path
        d="M8.31875 15.36C4.26 15.36 0.9575 12.0588 0.9575 8.00001C0.9575 3.94126 4.26 0.640015 8.31875 0.640015C10.1575 0.640015 11.9175 1.32126 13.2763 2.55876L13.5238 2.78501L11.0963 5.21251L10.8713 5.02001C10.1588 4.41001 9.2525 4.07376 8.31875 4.07376C6.15375 4.07376 4.39125 5.83501 4.39125 8.00001C4.39125 10.165 6.15375 11.9263 8.31875 11.9263C9.88 11.9263 11.1138 11.1288 11.695 9.77001H7.99875V6.45626L15.215 6.46626L15.2688 6.72001C15.645 8.50626 15.3438 11.1338 13.8188 13.0138C12.5563 14.57 10.7063 15.36 8.31875 15.36Z"
        fill="#6B7280"
      />
    </g>
    <defs>
      <clipPath id="clip0_4178_176214">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

function gotoUrl(url: string, newTab?: boolean) {
  if (newTab) {
    window.open(url, "_blank");
    return;
  }
  window.location.href = url;
}

export function GoogleWorkspaceInviteButton(props: PropsWithChildren) {
  const router = useRouter();
  const teamId = Number(router.query.id);
  const [googleWorkspaceLoading, setGoogleWorkspaceLoading] = useState(false);
  const { data: hasExistingWorkspaceConnection, isLoading } =
    trpc.viewer.appsRouter.checkForGWorkspace.useQuery();
  // see if user has any google workspace credentials attached

  // Show populate input button if they do
  if (hasExistingWorkspaceConnection) {
    return (
      <Tooltip content="You must be a workspace admin to this feature">
        <Button>oooo we have a connection - populate the fkin list </Button>
      </Tooltip>
    );
  }

  // else show invite button
  return (
    <Button
      type="button"
      color="secondary"
      loading={googleWorkspaceLoading}
      StartIcon={GoogleIcon}
      onClick={async () => {
        setGoogleWorkspaceLoading(true);
        const params = new URLSearchParams({
          teamId: teamId.toString(),
        });
        const res = await fetch(`/api/teams/googleworkspace/add?${params}`);

        if (!res.ok) {
          const errorBody = await res.json();
          throw new Error(errorBody.message || "Something went wrong");
        }
        setGoogleWorkspaceLoading(false);

        const json = await res.json();
        gotoUrl(json.url, json.newTab);
      }}
      className="justify-center gap-2">
      Import via Google Workspace
    </Button>
  );
}
