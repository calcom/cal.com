import { TailwindSidebar } from "@funnelhub/sidebar";
import { useSession } from "next-auth/react";

type sidebarConfigProps = {
  userId: string;
  token: string;
  workspaceId?: string;
};

export function sidebarConfig({ token, userId, workspaceId }: sidebarConfigProps) {
  return {
    url: `${
      process.env.NEXT_PUBLIC_FUNNELHUB_URL ?? "https://hub.funnelhub.io"
    }/api/v1/users/${userId}/workspaces/${workspaceId}/profile`,
    token,
    method: "GET",
  };
}

export const FunnelHubSidebar = () => {
  const session = useSession() as any;
  return (
    <>
      {session.data?.user?.currentWorkspace && (
        <TailwindSidebar
          menuData={[]}
          initialCollapsedState={true}
          className="border-r-gray-[#282939] !h-auto bg-[#14141F] hover:[&>a>div]:bg-[#BF0D51]"
          config={sidebarConfig({
            workspaceId: session.data.user.currentWorkspace.id,
            userId: session.data.user.funnelhubId,
            token: session.data.user.funnelhubToken,
          })}
        />
      )}
    </>
  );
};
