import { r } from "msw/lib/glossary-58eca5a8";
import { useRouter } from "next/router";
import React from "react";
import z from "zod";

import { InstallAppButton } from "@calcom/app-store/components";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import type { App } from "@calcom/types/App";
import { Alert } from "@calcom/ui/Alert";
import Button from "@calcom/ui/Button";
import { Icon } from "@calcom/ui/Icon";
import { List } from "@calcom/ui/List";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";
import EmptyScreen from "@calcom/ui/v2/core/EmptyScreen";
import { ShellSubHeading } from "@calcom/ui/v2/core/Shell";
import InstalledAppsLayout from "@calcom/ui/v2/core/layouts/InstalledAppsLayout";

import { QueryCell } from "@lib/QueryCell";

import DisconnectIntegration from "@components/integrations/DisconnectIntegration";
import IntegrationListItem from "@components/integrations/IntegrationListItem";
import { CalendarListContainer } from "@components/v2/apps/CalendarListContainer";

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
}

const IntegrationsList = ({ data }: { data: inferQueryOutput<"viewer.integrations"> }) => {
  return (
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
  );
};

const IntegrationsContainer = ({ variant, exclude }: IntegrationsContainerProps): JSX.Element => {
  console.log("Loading", { variant, exclude });
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { variant, exclude, onlyInstalled: true }]);
  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader />}
      success={({ data }) => {
        return (
          <>
            {data.items.length > 0 ? (
              variant ? (
                <>
                  <ShellSubHeading
                    title={t(variant || "misc")}
                    subtitle={t(`installed_app_${variant || "misc"}_description`)}
                  />
                  <IntegrationsList data={data} />
                </>
              ) : (
                <IntegrationsList data={data} />
              )
            ) : (
              <EmptyScreen
                Icon={Icon.FiCalendar}
                headline={t("no_category_apps", {
                  category: (variant && t(variant).toLowerCase()) || t("misc"),
                })}
                description={t(`no_category_apps_description_${variant || "misc"}`)}
              />
            )}
          </>
        );
      }}
    />
  );
};

const querySchema = z.object({
  category: z.enum(["calendar", "conferencing", "payment", "misc"]),
});

export default function InstalledApps() {
  const { t } = useLocale();
  const router = useRouter();
  const { category } = router.isReady ? querySchema.parse(router.query) : { category: "calendar" as const };

  return (
    <InstalledAppsLayout heading={t("installed_apps")} subtitle={t("manage_your_connected_apps")}>
      {(category === "payment" || category === "conferencing") && (
        <IntegrationsContainer variant={category} />
      )}
      {category === "misc" && <IntegrationsContainer exclude={["calendar", "conferencing", "payment"]} />}
      {category === "calendar" && <CalendarListContainer />}
    </InstalledAppsLayout>
  );
}
