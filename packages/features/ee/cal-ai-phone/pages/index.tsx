"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import { CreateButtonWithTeamsList } from "@calcom/features/ee/teams/components/createButton/CreateButtonWithTeamsList";
import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { trpc } from "@calcom/trpc/react";
import { EmptyScreen as ClassicEmptyScreen } from "@calcom/ui/components/empty-screen";
import { Icon } from "@calcom/ui/components/icon";
import { showToast } from "@calcom/ui/components/toast";

import { FilterResults } from "../../../filters/components/FilterResults";
import { TeamsFilter } from "../../../filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "../../../filters/lib/getTeamsFiltersFromQuery";
import LicenseRequired from "../../common/components/LicenseRequired";
import AgentsListPage from "../components/AgentsListPage";
import SkeletonLoader from "../components/SkeletonLoaderList";

const EmptyScreen = ({ isFilteredView }: { isFilteredView: boolean }) => {
  const { t } = useLocale();
  const router = useRouter();

  const createMutation = trpc.viewer.ai.create.useMutation({
    onSuccess: async ({ agent }) => {
      await router.replace(`/agents/${agent.id}`);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_workflow_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

  if (isFilteredView) {
    return (
      <ClassicEmptyScreen Icon="zap" headline={t("no_agents")} description={t("change_filter_agents")} />
    );
  }

  return (
    <div className="min-h-80 flex w-full flex-col items-center justify-center rounded-md ">
      <div className="bg-emphasis flex h-[72px] w-[72px] items-center justify-center rounded-full">
        <Icon name="zap" className="dark:text-default inline-block h-10 w-10 stroke-[1.3px]" />
      </div>
      <div className="max-w-[420px] text-center">
        <h2 className="text-semibold font-cal mt-6 text-xl dark:text-gray-300">{t("agents")}</h2>
        <p className="text-default mt-3 line-clamp-2 text-sm font-normal leading-6 dark:text-gray-300">
          {t("no_agents_description")}
        </p>
        <div className="mt-8 ">
          <CreateButtonWithTeamsList
            subtitle={t("new_agent_subtitle").toUpperCase()}
            createFunction={(teamId?: number) => createMutation.mutate({ teamId })}
            buttonText={t("create_agent")}
            isPending={createMutation.isPending}
            includeOrg={true}
          />
        </div>
      </div>
    </div>
  );
};

function AgentsPage() {
  const { t } = useLocale();
  const session = useSession();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const filters = getTeamsFiltersFromQuery(routerQuery);

  const { data, isPending } = trpc.viewer.ai.list.useQuery();

  const createMutation = trpc.viewer.ai.create.useMutation({
    onSuccess: async ({ agent }) => {
      await router.replace(`/agents/${agent.id}`);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: ${t("error_workflow_unauthorized_create")}`;
        showToast(message, "error");
      }
    },
  });

  const filteredAgents = data;

  return (
    <Shell withoutMain>
      <LicenseRequired>
        <ShellMain
          heading={t("agents")}
          subtitle={t("agents_description")}
          title={t("agents")}
          description={t("agents_description")}
          CTA={
            session.data?.hasValidLicense ? (
              <CreateButtonWithTeamsList
                subtitle={t("new_workflow_subtitle").toUpperCase()}
                createFunction={(teamId?: number) => {
                  createMutation.mutate({ teamId });
                }}
                isPending={createMutation.isPending}
                disableMobileButton={true}
                onlyShowWithNoTeams={true}
                includeOrg={true}
              />
            ) : null
          }>
          <>
            {filteredAgents?.totalCount ? (
              <div className="flex">
                <TeamsFilter />
                <div className="mb-4 ml-auto">
                  <CreateButtonWithTeamsList
                    subtitle={t("new_agent_subtitle").toUpperCase()}
                    createFunction={(teamId?: number) => createMutation.mutate({ teamId })}
                    isPending={createMutation.isPending}
                    disableMobileButton={true}
                    onlyShowWithTeams={true}
                    includeOrg={true}
                  />
                </div>
              </div>
            ) : null}
            <FilterResults
              queryRes={{ isPending, data: filteredAgents }}
              emptyScreen={<EmptyScreen isFilteredView={false} />}
              noResultsScreen={<EmptyScreen isFilteredView={true} />}
              SkeletonLoader={SkeletonLoader}>
              <AgentsListPage agents={filteredAgents?.filtered || []} />
            </FilterResults>
          </>
        </ShellMain>
      </LicenseRequired>
    </Shell>
  );
}

export default AgentsPage;
