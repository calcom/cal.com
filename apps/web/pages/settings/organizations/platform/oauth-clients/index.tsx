import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/router";
import React from "react";

import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { EmptyScreen, showToast } from "@calcom/ui";
import { Meta, Button } from "@calcom/ui";
import { Spinner } from "@calcom/ui/components/icon/Spinner";

import { useOAuthClients } from "@lib/hooks/settings/organizations/platform/oauth-clients/useOAuthClients";
import { useDeleteOAuthClient } from "@lib/hooks/settings/organizations/platform/oauth-clients/usePersistOAuthClient";

import PageWrapper from "@components/PageWrapper";
import { OAuthClientCard } from "@components/settings/organizations/platform/oauth-clients/OAuthClientCard";

const queryClient = new QueryClient();

export const OAuthClients = () => {
  const { data, isLoading, refetch: refetchClients } = useOAuthClients();
  const { mutateAsync, isPending: isDeleting } = useDeleteOAuthClient({
    onSuccess: () => {
      showToast("OAuth client deleted successfully", "success");
      refetchClients();
    },
  });

  const handleDelete = async (id: string) => {
    await mutateAsync({ id: id });
  };

  const NewOAuthClientButton = () => {
    const router = useRouter();

    return (
      <Button
        onClick={(e) => {
          e.preventDefault();
          router.push("/settings/organizations/platform/oauth-clients/create");
        }}
        color="secondary"
        StartIcon={Plus}>
        Add
      </Button>
    );
  };

  if (isLoading) {
    return <Spinner className="mx-auto mt-12 h-10 w-10" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <Meta
          title="OAuth Clients"
          description="Connect your platform to cal.com with oAuth"
          CTA={<NewOAuthClientButton />}
          borderInShellHeader={true}
        />
        <div>
          {Array.isArray(data) && data.length ? (
            <>
              <div className="border-subtle rounded-b-lg border border-t-0">
                {data.map((client, index) => {
                  return (
                    <OAuthClientCard
                      name={client.name}
                      redirectUris={client.redirectUris}
                      permissions={client.permissions}
                      key={index}
                      lastItem={data.length === index + 1}
                      id={client.id}
                      secret={client.secret}
                      isLoading={isDeleting}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyScreen
              headline="Create your first OAuth client"
              description="OAuth clients facilitate access to Cal.com on behalf of users"
              Icon={Plus}
              className="rounded-b-lg rounded-t-none border-t-0"
              buttonRaw={<NewOAuthClientButton />}
            />
          )}
        </div>
      </div>
    </QueryClientProvider>
  );
};

OAuthClients.getLayout = getLayout;
OAuthClients.PageWrapper = PageWrapper;

export default OAuthClients;
