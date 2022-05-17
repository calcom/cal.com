import { ArrowRightIcon, ViewGridIcon } from "@heroicons/react/solid";
import Image from "next/image";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { JSONObject } from "superjson/dist/types";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import type { App } from "@calcom/types/App";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import EmptyScreen from "@calcom/ui/EmptyScreen";

import { QueryCell } from "@lib/QueryCell";
import classNames from "@lib/classNames";
import { HttpError } from "@lib/core/http/error";
import { trpc, inferQueryOutput } from "@lib/trpc";

import AppsShell from "@components/AppsShell";
import { ClientSuspense } from "@components/ClientSuspense";
import { List, ListItem, ListItemText, ListItemTitle } from "@components/List";
import Shell, { ShellSubHeading } from "@components/Shell";
import SkeletonLoader from "@components/apps/SkeletonLoader";
import { CalendarListContainer } from "@components/integrations/CalendarListContainer";
import DisconnectIntegration from "@components/integrations/DisconnectIntegration";
import IntegrationListItem from "@components/integrations/IntegrationListItem";
import SubHeadingTitleWithConnections from "@components/integrations/SubHeadingTitleWithConnections";

function ConnectOrDisconnectIntegrationButton(props: {
  credentialIds: number[];
  type: App["type"];
  isGlobal?: boolean;
  installed?: boolean;
}) {
  const { t } = useLocale();
  const [credentialId] = props.credentialIds;
  const utils = trpc.useContext();
  const handleOpenChange = () => {
    utils.invalidateQueries(["viewer.integrations"]);
  };

  if (credentialId) {
    return (
      <DisconnectIntegration
        id={credentialId}
        render={(btnProps) => (
          <Button {...btnProps} color="warn" data-testid="integration-connection-button">
            {t("disconnect")}
          </Button>
        )}
        onOpenChange={handleOpenChange}
      />
    );
  }
  if (!props.installed) {
    return (
      <div className="flex items-center truncate">
        <Alert severity="warning" title={t("not_installed")} />
      </div>
    );
  }
  /** We don't need to "Connect", just show that it's installed */
  if (props.isGlobal) {
    return (
      <div className="truncate px-3 py-2">
        <h3 className="text-sm font-medium text-gray-700">{t("installed")}</h3>
      </div>
    );
  }
  return (
    <InstallAppButton
      type={props.type}
      render={(buttonProps) => (
        <Button color="secondary" {...buttonProps} data-testid="integration-connection-button">
          {t("connect")}
        </Button>
      )}
      onChanged={handleOpenChange}
    />
  );
}

type AppOutput = inferQueryOutput<"viewer.integrations">["items"][0];

interface IntegrationsContainerProps {
  variant: App["variant"];
  className?: string;
}

const IntegrationsContainer = ({ variant, className = "" }: IntegrationsContainerProps): JSX.Element => {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { variant }], { suspense: true });
  const installedFilter = (app: AppOutput) => app.credentialIds.length > 0 || app.isGlobal;
  return (
    <QueryCell
      query={query}
      success={({ data }) => {
        const installedApps = data.items.filter(installedFilter);
        return (
          <>
            {installedApps.length > 0 && (
              <div className={className}>
                <ShellSubHeading
                  title={
                    <SubHeadingTitleWithConnections title={t(variant)} numConnections={data.numActive} />
                  }
                />
                <List>
                  {installedApps.map((item: AppOutput) => (
                    <IntegrationListItem
                      key={item.title}
                      title={item.title}
                      imageSrc={item.imageSrc}
                      description={item.description}
                      actions={
                        <ConnectOrDisconnectIntegrationButton
                          credentialIds={item.credentialIds}
                          type={item.type}
                          isGlobal={item.isGlobal}
                          installed
                        />
                      }
                    />
                  ))}
                </List>
              </div>
            )}
          </>
        );
      }}></QueryCell>
  );
};

function Web3Container() {
  const { t } = useLocale();
  const result = trpc.useQuery(["viewer.web3Integration"]);
  const isWeb3Active = result.data?.isWeb3Active as boolean;
  return (
    <>
      {isWeb3Active && (
        <>
          <ShellSubHeading title="Web3" subtitle={t("meet_people_with_the_same_tokens")} className="mt-10" />
          <div className="lg:col-span-9 lg:pb-8">
            <List>
              <ListItem className={classNames("flex-col")}>
                <div className={classNames("flex w-full flex-1 items-center space-x-2 p-3")}>
                  <Image width={40} height={40} src="/apps/metamask.svg" alt="Embed" />
                  <div className="flex-grow truncate pl-2">
                    <ListItemTitle component="h3">
                      MetaMask (
                      <a
                        className="text-blue-500"
                        target="_blank"
                        href="https://cal.com/web3"
                        rel="noreferrer">
                        Read more
                      </a>
                      )
                    </ListItemTitle>
                    <ListItemText component="p">{t("only_book_people_and_allow")}</ListItemText>
                  </div>
                  <Web3ConnectBtn />
                </div>
              </ListItem>
            </List>
          </div>
        </>
      )}
    </>
  );
}

function Web3ConnectBtn() {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [connectionBtn, setConnection] = useState(false);
  const result = trpc.useQuery(["viewer.web3Integration"]);
  const mutation = trpc.useMutation("viewer.enableOrDisableWeb3", {
    onSuccess: async (result) => {
      const { key = {} } = result as JSONObject;

      if ((key as JSONObject).isWeb3Active) {
        showToast(t("web3_metamask_added"), "success");
      } else {
        showToast(t("web3_metamask_disconnected"), "success");
      }
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  useEffect(() => {
    if (result.data) {
      setConnection(result.data.isWeb3Active as boolean);
    }
  }, [result]);

  const enableOrDisableWeb3 = async (mutation: any) => {
    const result = await mutation.mutateAsync({});
    setConnection(result.key.isWeb3Active);
    utils.invalidateQueries("viewer.web3Integration");
  };

  return (
    <Button
      loading={mutation.isLoading}
      color={connectionBtn ? "warn" : "secondary"}
      disabled={result.isLoading || mutation.isLoading}
      onClick={async () => await enableOrDisableWeb3(mutation)}
      data-testid="metamask">
      {connectionBtn ? t("remove") : t("add")}
    </Button>
  );
}

export default function IntegrationsPage() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { variant: "calendar" }]);
  return (
    <QueryCell
      query={query}
      success={({ data }) => {
        return (
          <Shell
            heading={t("installed_apps")}
            subtitle={t("manage_your_connected_apps")}
            large
            customLoader={<SkeletonLoader />}>
            <AppsShell>
              <ClientSuspense fallback={<SkeletonLoader />}>
                {data.total > 0 && (
                  <>
                    <IntegrationsContainer variant="conferencing" />
                    <CalendarListContainer />
                    <IntegrationsContainer variant="payment" className="mt-8" />
                    <IntegrationsContainer variant="other" className="mt-8" />
                    <Web3Container />
                  </>
                )}
                {data.total === 0 && (
                  <EmptyScreen
                    Icon={ViewGridIcon}
                    headline={t("no_installed_apps")}
                    description={
                      <Link href="/apps" passHref>
                        <a className="text-neutral-900">
                          <span>{t("no_installed_apps_description")}</span>
                          <ArrowRightIcon className="-mt-1 ml-1 inline h-5 w-5" />
                        </a>
                      </Link>
                    }
                  />
                )}
              </ClientSuspense>
            </AppsShell>
          </Shell>
        );
      }}></QueryCell>
  );
}
