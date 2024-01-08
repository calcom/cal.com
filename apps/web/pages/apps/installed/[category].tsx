"use client";

import { useReducer } from "react";
import { z } from "zod";

import DisconnectIntegrationModal from "@calcom/features/apps/components/DisconnectIntegrationModal";
import { useCompatSearchParams } from "@calcom/lib/hooks/useCompatSearchParams";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { AppCategories } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { AppGetServerSidePropsContext } from "@calcom/types/AppGetServerSideProps";
import { Button, EmptyScreen, AppSkeletonLoader as SkeletonLoader, ShellSubHeading } from "@calcom/ui";
import type { LucideIcon } from "@calcom/ui/components/icon";
import {
  BarChart,
  Calendar,
  Contact,
  CreditCard,
  Grid,
  Mail,
  Plus,
  Share2,
  Video,
} from "@calcom/ui/components/icon";

import { QueryCell } from "@lib/QueryCell";

import PageWrapper from "@components/PageWrapper";
import { AppList } from "@components/apps/AppList";
import { CalendarListContainer } from "@components/apps/CalendarListContainer";
import InstalledAppsLayout from "@components/apps/layouts/InstalledAppsLayout";

interface IntegrationsContainerProps {
  variant?: AppCategories;
  exclude?: AppCategories[];
  handleDisconnect: (credentialId: number) => void;
}

const IntegrationsContainer = ({
  variant,
  exclude,
  handleDisconnect,
}: IntegrationsContainerProps): JSX.Element => {
  const { t } = useLocale();
  const query = trpc.viewer.integrations.useQuery({
    variant,
    exclude,
    onlyInstalled: true,
    includeTeamInstalledApps: true,
  });

  // TODO: Refactor and reuse getAppCategories?
  const emptyIcon: Record<AppCategories, LucideIcon> = {
    calendar: Calendar,
    conferencing: Video,
    automation: Share2,
    analytics: BarChart,
    payment: CreditCard,
    other: Grid,
    web3: CreditCard, // deprecated
    video: Video, // deprecated
    messaging: Mail,
    crm: Contact,
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
                  href={variant ? `/apps/categories/${variant}` : "/apps"}
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
  category: z.nativeEnum(AppCategories),
});

type querySchemaType = z.infer<typeof querySchema>;

type ModalState = {
  isOpen: boolean;
  credentialId: null | number;
  teamId?: number;
};

export default function InstalledApps() {
  const searchParams = useCompatSearchParams();
  const { t } = useLocale();
  const category = searchParams?.get("category") as querySchemaType["category"];
  const categoryList: AppCategories[] = Object.values(AppCategories).filter((category) => {
    // Exclude calendar and other from categoryList, we handle those slightly differently below
    return !(category in { other: null, calendar: null });
  });

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

  const handleDisconnect = (credentialId: number, teamId?: number) => {
    updateData({ isOpen: true, credentialId, teamId });
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
        teamId={data.teamId}
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
