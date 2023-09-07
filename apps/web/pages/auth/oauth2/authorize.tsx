import { useRouter } from "next/router";

import { getLayout } from "@calcom/features/NoShellLayout";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";

export default function Authorize() {
  const router = useRouter();

  const { state, client_id } = router.query;

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
    <div className="m-5">
      <Button
        onClick={() => {
          generateAuthCodeMutation.mutate({ clientId: client_id });
        }}>
        Allow {client.name} access
      </Button>
    </div>
  );
}

Authorize.PageWrapper = PageWrapper;
Authorize.getLayout = getLayout;
