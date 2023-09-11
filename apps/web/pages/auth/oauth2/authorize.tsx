import { useRouter } from "next/router";

import { getLayout } from "@calcom/features/NoShellLayout";
import { trpc } from "@calcom/trpc/react";
import { Avatar, Button } from "@calcom/ui";
import { Plus, Info } from "@calcom/ui/components/icon";

import PageWrapper from "@components/PageWrapper";

export default function Authorize() {
  const router = useRouter();

  const { state, client_id, scope } = router.query;
  if (!router.isReady) return null;
  const scopes = scope ? scope.toString().split(",") : [];

  const { data: client, isLoading: isLoadingGetClient } = trpc.viewer.oAuth.getClient.useQuery({
    clientId: client_id,
  });

  const generateAuthCodeMutation = trpc.viewer.oAuth.generateAuthCode.useMutation({
    onSuccess: (data) => {
      window.location.href = `${client.redirectUri}?code=${data.authorizationCode}&state=${state}`;
    },
  });

  if (isLoadingGetClient) return <div>Loading...</div>;

  if (!client) return <div>Unauthorized</div>;

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="max-w-xl rounded-md bg-white px-9 pb-3 pt-6">
        <div className="flex items-center justify-center">
          <Avatar
            alt=""
            fallback={<Plus className="text-subtle h-6 w-6" />}
            className="items-center"
            imageSrc={client.logo}
            size="lg"
          />
          <div className="relative -ml-6 h-24 w-24">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-[70px] w-[70px] items-center justify-center  rounded-full bg-white">
                <img src="/cal-com-icon.svg" alt="Logo" className="h-16 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        <h1 className="p-5 text-center text-2xl font-bold tracking-tight">
          {client.name} would like access to your Cal.com account
        </h1>
        <div className="mb-4 mt-2 font-medium">This will allow {client.name} to</div>
        <ul className="space-y-4 text-sm">
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> Associate you with your personal info from
            Cal.com
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> See your personal info, including any personal
            info you&apos;ve made publicly available
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> See your primary email address
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> Connect to your installed apps
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> Read, edit, delete your event-types
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> Read, edit, delete your availability
          </li>
          <li className="relative pl-5">
            <span className="absolute left-0">&#10003;</span> Read, edit, delete your bookings
          </li>
        </ul>
        <div className="bg-subtle mb-8 mt-8 flex rounded-md p-3">
          <div>
            <Info className="mr-1 mt-0.5 h-4 w-4" />
          </div>
          <div className="ml-1 ">
            <div className="text-sm font-medium">Allow {client.name} to do this?</div>
            <div className="text-sm">
              By clicking allow, you allow this app to use your information in accordance with thei terms of
              service and privacy policy. You can view or remove access in the Cal.com App Store.
            </div>{" "}
            {/* How can access be viewed? Access can be removed by uninstalling app */}
          </div>
        </div>
        <div className="border-subtle border- -mx-9 mb-4 border-b" />
        <div className="flex justify-end">
          <Button
            className="mr-2"
            color="minimal"
            onClick={() => {
              window.location.href = `${client.redirectUri}`;
            }}>
            Go back
          </Button>
          <Button
            onClick={() => {
              generateAuthCodeMutation.mutate({ clientId: client_id, scopes });
            }}>
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}

Authorize.PageWrapper = PageWrapper;
Authorize.getLayout = getLayout;
