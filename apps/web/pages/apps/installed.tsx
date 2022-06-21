import { ArrowRightIcon, ViewGridIcon } from "@heroicons/react/solid";
import Image from "next/image";
import React from "react";

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
import { trpc } from "@lib/trpc";

import AppsShell from "@components/AppsShell";
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
  const type = props.type;
  const utils = trpc.useContext();
  const handleOpenChange = () => {
    utils.invalidateQueries(["viewer.integrations"]);
  };

  if (credentialId) {
    if (type === "stripe_payment") {
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

interface IntegrationsContainerProps {
  variant: App["variant"];
  className?: string;
}

const IntegrationsContainer = ({ variant, className = "" }: IntegrationsContainerProps): JSX.Element => {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { variant, onlyInstalled: true }], { suspense: true });

  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader className={className} />}
      success={({ data }) => {
        return (
          <>
            {data.items.length > 0 && (
              <div className={className}>
                <ShellSubHeading
                  title={
                    <SubHeadingTitleWithConnections title={t(variant)} numConnections={data.items.length} />
                  }
                />
                <List>
                  {data.items.map((item) => (
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
      }}
    />
  );
};

function Web3Container() {
  const { t } = useLocale();
  const result = trpc.useQuery(["viewer.web3Integration"]);
  const isWeb3Active = !!result.data?.isWeb3Active;
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
  const result = trpc.useQuery(["viewer.web3Integration"]);
  const mutation = trpc.useMutation("viewer.enableOrDisableWeb3", {
    onSuccess: async (result) => {
      const { key } = result;
      if ((key as { isWeb3Active: boolean }).isWeb3Active) {
        showToast(t("web3_metamask_added"), "success");
      } else {
        showToast(t("web3_metamask_disconnected"), "success");
      }
      utils.invalidateQueries("viewer.web3Integration");
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }
    },
  });

  return (
    <Button
      loading={mutation.isLoading}
      color={result.data?.isWeb3Active ? "warn" : "secondary"}
      disabled={result.isLoading || mutation.isLoading}
      onClick={() => {
        mutation.mutateAsync({});
      }}
      data-testid="metamask">
      {result.data?.isWeb3Active ? t("remove") : t("add")}
    </Button>
  );
}

export default function IntegrationsPage() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { onlyInstalled: true }]);
  return (
    <Shell
      heading={t("installed_apps")}
      subtitle={t("manage_your_connected_apps")}
      large
      customLoader={<SkeletonLoader />}>
      <AppsShell>
        <QueryCell
          query={query}
          success={({ data }) => {
            return data.items.length > 0 ? (
              <>
                <IntegrationsContainer variant="conferencing" />
                <CalendarListContainer />
                <IntegrationsContainer variant="payment" className="mt-8" />
                <IntegrationsContainer variant="other" className="mt-8" />
                <Web3Container />
              </>
            ) : (
              <EmptyScreen
                Icon={ViewGridIcon}
                headline={t("empty_installed_apps_headline")}
                description={
                  <>
                    <span className="mb-6 block">{t("empty_installed_apps_description")}</span>
                    <Button href="/apps" EndIcon={ArrowRightIcon}>
                      {t("empty_installed_apps_button")}
                    </Button>
                  </>
                }
              />
            );
          }}
        />
      </AppsShell>
    </Shell>
  );
}
