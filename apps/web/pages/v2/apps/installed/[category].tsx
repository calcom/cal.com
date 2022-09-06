import { useRouter } from "next/router";
import React from "react";
import z from "zod";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import { List } from "@calcom/ui/List";
import Shell, { ShellSubHeading } from "@calcom/ui/Shell";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";
import EmptyScreen from "@calcom/ui/v2/core/EmptyScreen";
import InstalledAppsLayout from "@calcom/ui/v2/core/layouts/InstalledAppsLayout";

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
  variant?: App["variant"];
  exclude?: App["variant"][];
  className?: string;
}

const IntegrationsContainer = ({
  variant,
  exclude,
  className = "",
}: IntegrationsContainerProps): JSX.Element => {
  console.log("Loading", { variant, exclude });
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { variant, exclude, onlyInstalled: true }]);
  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader className={className} />}
      success={({ data }) => {
        return (
          <>
            {data.items.length > 0 ? (
              <div className={className}>
                {variant && (
                  <ShellSubHeading
                    title={
                      <SubHeadingTitleWithConnections title={t(variant)} numConnections={data.items.length} />
                    }
                  />
                )}
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
            ) : (
              <EmptyScreen
                Icon={Icon.FiCalendar}
                headline={variant ? t(variant) : ""}
                description="Some text to describe this empty screen"
              />
            )}
          </>
        );
      }}
    />
  );
};

enum menuOptions {
  "calendar",
  "conferencing",
  "payments",
  "misc",
}

const menuOptionsContent: { [key in keyof typeof menuOptions]: () => JSX.Element } = {
  calendar: () => <IntegrationsContainer variant="calendar" />,
  conferencing: () => <IntegrationsContainer variant="conferencing" />,
  payments: () => <IntegrationsContainer variant="payment" />,
  misc: () => <IntegrationsContainer exclude={["calendar", "conferencing", "payment"]} />,
};

const querySchema = z.object({
  category: z.enum(["calendar", "conferencing", "payments", "misc"]),
});

export default function InstalledApps() {
  const router = useRouter();
  const { category } = router.isReady ? querySchema.parse(router.query) : { category: "calendar" as const };

  return <InstalledAppsLayout>{menuOptionsContent[category]()}</InstalledAppsLayout>;
}
