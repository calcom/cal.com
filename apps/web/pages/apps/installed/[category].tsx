import { useRouter } from "next/router";
import z from "zod";

import { AppSettings } from "@calcom/app-store/_components/AppSettings";
import { InstallAppButton } from "@calcom/app-store/components";
import { InstalledAppVariants } from "@calcom/app-store/utils";
import DisconnectIntegration from "@calcom/features/apps/components/DisconnectIntegration";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { RouterOutputs, trpc } from "@calcom/trpc/react";
import { App } from "@calcom/types/App";
import { AppGetServerSidePropsContext } from "@calcom/types/AppGetServerSideProps";
import {
  Alert,
  Button,
  EmptyScreen,
  Icon,
  List,
  ShellSubHeading,
  AppSkeletonLoader as SkeletonLoader,
} from "@calcom/ui";

import { QueryCell } from "@lib/QueryCell";

import { CalendarListContainer } from "@components/apps/CalendarListContainer";
import IntegrationListItem from "@components/apps/IntegrationListItem";
import InstalledAppsLayout from "@components/apps/layouts/InstalledAppsLayout";

function ConnectOrDisconnectIntegrationButton(props: {
  credentialIds: number[];
  type: App["type"];
  isGlobal?: boolean;
  installed?: boolean;
  invalidCredentialIds?: number[];
}) {
  const { type, credentialIds, isGlobal, installed } = props;
  const { t } = useLocale();
  const [credentialId] = credentialIds;

  const utils = trpc.useContext();
  const handleOpenChange = () => {
    utils.viewer.integrations.invalidate();
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

  if (!installed) {
    return (
      <div className="flex items-center truncate">
        <Alert severity="warning" title={t("not_installed")} />
      </div>
    );
  }
  /** We don't need to "Connect", just show that it's installed */
  if (isGlobal) {
    return (
      <div className="truncate px-3 py-2">
        <h3 className="text-sm font-medium text-gray-700">{t("default")}</h3>
      </div>
    );
  }
  return (
    <InstallAppButton
      type={type}
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
  variant?: keyof typeof InstalledAppVariants;
  exclude?: (keyof typeof InstalledAppVariants)[];
}

interface IntegrationsListProps {
  variant?: IntegrationsContainerProps["variant"];
  data: RouterOutputs["viewer"]["integrations"];
}

const IntegrationsList = ({ data }: IntegrationsListProps) => {
  return (
    <List className="flex flex-col gap-6" noBorderTreatment>
      {data.items
        .filter((item) => item.invalidCredentialIds)
        .map((item) => (
          <IntegrationListItem
            name={item.name}
            slug={item.slug}
            key={item.title}
            title={item.title}
            logo={item.logo}
            description={item.description}
            separate={true}
            invalidCredential={item.invalidCredentialIds.length > 0}
            actions={
              <div className="flex w-16 justify-end">
                <ConnectOrDisconnectIntegrationButton
                  credentialIds={item.credentialIds}
                  type={item.type}
                  isGlobal={item.isGlobal}
                  installed
                  invalidCredentialIds={item.invalidCredentialIds}
                />
              </div>
            }>
            <AppSettings slug={item.slug} />
          </IntegrationListItem>
        ))}
    </List>
  );
};

const IntegrationsContainer = ({ variant, exclude }: IntegrationsContainerProps): JSX.Element => {
  const { t } = useLocale();
  const query = trpc.viewer.integrations.useQuery({ variant, exclude, onlyInstalled: true });
  const emptyIcon = {
    calendar: Icon.FiCalendar,
    conferencing: Icon.FiVideo,
    automation: Icon.FiShare2,
    analytics: Icon.FiBarChart,
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
                <IntegrationsList data={data} variant={variant} />
              </div>
            ) : (
              <EmptyScreen
                Icon={emptyIcon[variant || "other"]}
                headline={t("no_category_apps", {
                  category: (variant && t(variant).toLowerCase()) || t("other").toLowerCase(),
                })}
                description={t(`no_category_apps_description_${variant || "other"}`)}
                buttonRaw={
                  <Button
                    color="secondary"
                    data-testid={`connect-${variant || "other"}-apps`}
                    href={variant ? `/apps/categories/${variant}` : "/apps/categories/other"}>
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

export default function InstalledApps() {
  const { t } = useLocale();
  const router = useRouter();
  const category = router.query.category;
  return (
    <InstalledAppsLayout heading={t("installed_apps")} subtitle={t("manage_your_connected_apps")}>
      {(category === InstalledAppVariants.payment || category === InstalledAppVariants.conferencing) && (
        <IntegrationsContainer variant={category} />
      )}
      {(category === InstalledAppVariants.automation || category === InstalledAppVariants.analytics) && (
        <IntegrationsContainer variant={category} />
      )}
      {category === InstalledAppVariants.calendar && <CalendarListContainer />}
      {category === InstalledAppVariants.other && (
        <IntegrationsContainer
          exclude={[
            InstalledAppVariants.conferencing,
            InstalledAppVariants.calendar,
            InstalledAppVariants.analytics,
            InstalledAppVariants.automation,
          ]}
        />
      )}
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
