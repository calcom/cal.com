import { useRouter } from "next/router";
import { useReducer } from "react";
import z from "zod";

import { InstalledAppVariants } from "@calcom/app-store/utils";
import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { AppGetServerSidePropsContext } from "@calcom/types/AppGetServerSideProps";
import { Button, EmptyScreen, AppSkeletonLoader as SkeletonLoader, ShellSubHeading } from "@calcom/ui";
import { BarChart, Calendar, CreditCard, Grid, Plus, Share2, Video } from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";

import PageWrapper from "@components/PageWrapper";
import { AppList } from "@components/apps/AppList";
import { CalendarListContainer } from "@components/apps/CalendarListContainer";
import InstalledAppsLayout from "@components/apps/layouts/InstalledAppsLayout";

interface IntegrationsContainerProps {
  variant?: (typeof InstalledAppVariants)[number];
  exclude?: (typeof InstalledAppVariants)[number][];
  handleDisconnect: (credentialId: number) => void;
}

const IntegrationsContainer = ({
  variant,
  exclude,
  handleDisconnect,
}: IntegrationsContainerProps): JSX.Element => {
  const { t } = useLocale();
  const query = trpc.viewer.integrations.useQuery({ variant, exclude, onlyInstalled: true });
  const emptyIcon = {
    calendar: Calendar,
    conferencing: Video,
    automation: Share2,
    analytics: BarChart,
    payment: CreditCard,
    web3: BarChart,
    other: Grid,
  };

  return (
    <QueryCell
      query={query}
      customLoader={<SkeletonLoader />}
      success={({ data }) => {
        if (!data.items.length) {
          return (
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
          );
        }
        return (
          <div className="border-subtle rounded-md border p-7">
            <ShellSubHeading
              title={t(variant || "other")}
              subtitle={t(`installed_app_${variant || "other"}_description`)}
              className="mb-6"
              actions={
                <Button
                  href={
                    variant ? `/apps/categories/${variant === "conferencing" ? "video" : variant}` : "/apps"
                  }
                  color="secondary"
                  StartIcon={Plus}>
                  {t("add")}
                </Button>
              }
            />

            <AppList handleDisconnect={handleDisconnect} data={data} variant={variant} />
          </div>
        );
      }}
    />
  );
};

const querySchema = z.object({
  category: z.enum(InstalledAppVariants),
});

type querySchemaType = z.infer<typeof querySchema>;

type ModalState = {
  isOpen: boolean;
  credentialId: null | number;
};

export default function InstalledApps() {
  const { t } = useLocale();
  const router = useRouter();
  const category = router.query.category as querySchemaType["category"];
  const categoryList: querySchemaType["category"][] = [
    "payment",
    "conferencing",
    "automation",
    "analytics",
    "web3",
  ];

  const [data, updateData] = useReducer(
    (data: ModalState, partialData: Partial<ModalState>) => ({ ...data, ...partialData }),
    {
      isOpen: false,
      credentialId: null,
    }
  );

  const handleModelClose = () => {
    updateData({ isOpen: false, credentialId: null });
  };

  const handleDisconnect = (credentialId: number) => {
    updateData({ isOpen: true, credentialId });
  };

  return (
    <>
      <InstalledAppsLayout heading={t("installed_apps")} subtitle={t("manage_your_connected_apps")}>
        {categoryList.includes(category) && (
          <IntegrationsContainer handleDisconnect={handleDisconnect} variant={category} />
        )}
        {category === "calendar" && <CalendarListContainer />}
        {category === "other" && (
          <IntegrationsContainer
            handleDisconnect={handleDisconnect}
            variant={category}
            exclude={[...categoryList, "calendar"]}
          />
        )}
      </InstalledAppsLayout>
      <DisconnectIntegrationModal
        handleModelClose={handleModelClose}
        isOpen={data.isOpen}
        credentialId={data.credentialId}
      />
    </>
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

InstalledApps.PageWrapper = PageWrapper;
