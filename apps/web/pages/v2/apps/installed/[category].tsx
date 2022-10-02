import { InferGetServerSidePropsType } from "next";
import z from "zod";

import { InstallAppButton } from "@calcom/app-store/components";
import { InstalledAppVariants } from "@calcom/app-store/utils";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { inferQueryOutput, trpc } from "@calcom/trpc/react";
import { App } from "@calcom/types/App";
import { AppGetServerSidePropsContext } from "@calcom/types/AppGetServerSideProps";
import { Icon } from "@calcom/ui/Icon";
import SkeletonLoader from "@calcom/ui/apps/SkeletonLoader";
import { Alert } from "@calcom/ui/v2/core/Alert";
import Button from "@calcom/ui/v2/core/Button";
import EmptyScreen from "@calcom/ui/v2/core/EmptyScreen";
import { List } from "@calcom/ui/v2/core/List";
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
          trashIcon
          onSuccess={handleOpenChange}
          buttonProps={{ className: "border border-gray-300" }}
        />
      );
    }
    return (
      <DisconnectIntegration
        credentialId={credentialId}
        trashIcon
        onSuccess={handleOpenChange}
        buttonProps={{ className: "border border-gray-300" }}
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
  variant?: "calendar" | "conferencing" | "payment";
  exclude?: App["variant"][];
}

const IntegrationsList = ({ data }: { data: inferQueryOutput<"viewer.integrations"> }) => {
  return (
    <List noBorderTreatment>
      {data.items.map((item) => (
        <IntegrationListItem
          name={item.name}
          slug={item.slug}
          key={item.title}
          title={item.title}
          logo={item.logo}
          description={item.description}
          actions={
            <div className="flex w-32 justify-end">
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
  const { t } = useLocale();
  const query = trpc.useQuery(["viewer.integrations", { variant, exclude, onlyInstalled: true }]);
  const emptyIcon = {
    calendar: Icon.FiCalendar,
    conferencing: Icon.FiVideo,
    payment: Icon.FiCreditCard,
    other: Icon.FiGrid,
  };
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
                  actions={
                    <Button
                      href={
                        variant
                          ? `/apps/categories/${variant === "conferencing" ? "video" : variant}`
                          : "/apps"
                      }
                      color="secondary"
                      StartIcon={Icon.FiPlus}>
                      {t("add")}
                    </Button>
                  }
                />
                <IntegrationsList data={data} />
              </div>
            ) : (
              <EmptyScreen
                Icon={emptyIcon[variant || "other"]}
                headline={t("no_category_apps", {
                  category: (variant && t(variant).toLowerCase()) || t("other").toLowerCase(),
                })}
                description={t(`no_category_apps_description_${variant || "other"}`)}
                buttonRaw={
                  <Button color="secondary" href={variant ? `/apps/categories/${variant}` : "/apps"}>
                    {t(`connect_${variant || "other"}_apps`)}
                  </Button>
                }
              />
            )}
          </>
        );
      }}
    />
  );
};

const querySchema = z.object({
  category: z.nativeEnum(InstalledAppVariants),
});

export default function InstalledApps({ category }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const { t } = useLocale();

  return (
    <InstalledAppsLayout heading={t("installed_apps")} subtitle={t("manage_your_connected_apps")}>
      {(category === InstalledAppVariants.payment || category === InstalledAppVariants.conferencing) && (
        <IntegrationsContainer variant={category} />
      )}
      {category === InstalledAppVariants.other && (
        <IntegrationsContainer
          exclude={
            Object.keys(InstalledAppVariants).filter(
              (variant) => variant !== InstalledAppVariants.other
            ) as App["variant"][]
          }
        />
      )}
      {category === InstalledAppVariants.calendar && <CalendarListContainer />}
    </InstalledAppsLayout>
  );
}

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
  const params = querySchema.safeParse(ctx.params);

  if (!params.success) return { notFound: true };

  return {
    props: {
      category: params.data.category,
    },
  };
}
