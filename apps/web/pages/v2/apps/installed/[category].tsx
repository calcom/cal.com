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
import DisconnectIntegration from "@calcom/ui/v2/modules/integrations/DisconnectIntegration";

import { QueryCell } from "@lib/QueryCell";

import { CalendarListContainer } from "@components/v2/apps/CalendarListContainer";
import IntegrationListItem from "@components/v2/apps/IntegrationListItem";

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
          credentialId={credentialId}
          label={t("remove_app")
            .split(" ")
            .map((w, i) => (i == 1 ? w.toLowerCase() : w))
            .join(" ")}
          onSuccess={handleOpenChange}
        />
      );
    }
    return (
      <DisconnectIntegration
        credentialId={credentialId}
        label={t("remove_app")
          .split(" ")
          .map((w, i) => (i == 1 ? w.toLowerCase() : w))
          .join(" ")}
        onSuccess={handleOpenChange}
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
        <h3 className="text-sm font-medium text-gray-700">{t("default")}</h3>
      </div>
    );
  }
  return (
    <InstallAppButton
      type={props.type}
      render={(buttonProps) => (
        <Button color="secondary" {...buttonProps} data-testid="integration-connection-button">
          {t("install")}
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
            <div className="flex w-32 justify-center">
              <ConnectOrDisconnectIntegrationButton
                credentialIds={item.credentialIds}
                type={item.type}
                isGlobal={item.isGlobal}
                installed
              />
            </div>
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
              <div className="rounded-md border border-gray-200 p-7">
                <ShellSubHeading
                  title={t(variant || "other")}
                  subtitle={t(`installed_app_${variant || "other"}_description`)}
                  className="mb-6"
                />
                <IntegrationsList data={data} />
              </div>
            ) : (
              <EmptyScreen
                Icon={Icon.FiCalendar}
                headline={t("no_category_apps", {
                  category: (variant && t(variant).toLowerCase()) || t("other"),
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
  category: z.enum(["calendar", "conferencing", "payment", "other"]),
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
      {category === "other" && <IntegrationsContainer exclude={["calendar", "conferencing", "payment"]} />}
      {category === "calendar" && <CalendarListContainer />}
    </InstalledAppsLayout>
  );
}
