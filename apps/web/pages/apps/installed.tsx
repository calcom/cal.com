import React from "react";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";
import { AppGetServerSidePropsContext } from "@calcom/types/AppGetServerSideProps";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import EmptyScreen from "@calcom/ui/EmptyScreen";
import { Icon } from "@calcom/ui/Icon";
import { List } from "@calcom/ui/List";
import Shell, { ShellSubHeading } from "@calcom/ui/Shell";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";

import { QueryCell } from "@lib/QueryCell";

import AppsShell from "@components/AppsShell";
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
            <Button {...btnProps} color="warn" data-testid={type + "-integration-disconnect-button"}>
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
          <Button {...btnProps} color="warn" data-testid={type + "-integration-disconnect-button"}>
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
  const query = trpc.useQuery(["viewer.integrations", { variant, onlyInstalled: true }]);
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
                      name={item.name}
                      slug={item.slug}
                      key={item.title}
                      title={item.title}
                      logo={item.logo}
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

// Server side rendering
export async function getServerSideProps(ctx: AppGetServerSidePropsContext) {
  // get return-to cookie and redirect if needed
  const { cookies } = ctx.req;
  if (cookies && cookies["return-to"]) {
    const returnTo = cookies["return-to"];
    if (returnTo) {
      ctx.res.setHeader("Set-Cookie", "return-to=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT");
      return {
        redirect: {
          destination: `${returnTo}`,
          permanent: false,
        },
      };
    }
  }
  return {
    props: {},
  };
}

export default function IntegrationsPage() {
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { onlyInstalled: true }]);
  return (
    <Shell heading={t("installed_apps")} subtitle={t("manage_your_connected_apps")} large>
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
                <IntegrationsContainer variant="web3" className="mt-8" />
              </>
            ) : (
              <EmptyScreen
                Icon={Icon.FiGrid}
                headline={t("empty_installed_apps_headline")}
                description={
                  <>
                    <span className="mb-6 block">{t("empty_installed_apps_description")}</span>
                    <Button href="/apps" EndIcon={Icon.FiArrowRight}>
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
