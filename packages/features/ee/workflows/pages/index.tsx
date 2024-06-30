"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import Shell, { ShellMain } from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, CreateButtonWithTeamsList, showToast } from "@calcom/ui";

import { FilterResults } from "../../../filters/components/FilterResults";
import { TeamsFilter } from "../../../filters/components/TeamsFilter";
import { getTeamsFiltersFromQuery } from "../../../filters/lib/getTeamsFiltersFromQuery";
import LicenseRequired from "../../common/components/LicenseRequired";
import EmptyScreen from "../components/EmptyScreen";
import SkeletonLoader from "../components/SkeletonLoaderList";
import WorkflowList from "../components/WorkflowListPage";

function WorkflowsPage() {
  const { t } = useLocale();
  const session = useSession();
  const router = useRouter();
  const routerQuery = useRouterQuery();
  const filters = getTeamsFiltersFromQuery(routerQuery);

  const queryRes = trpc.viewer.workflows.filteredList.useQuery({
    filters,
  });

  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace(`/workflows/${workflow.id}`);
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

  return (
    <Shell withoutMain>
      <LicenseRequired>
        <ShellMain
          heading={t("workflows")}
          subtitle={t("workflows_to_automate_notifications")}
          title="Workflows"
          description="Create workflows to automate notifications and reminders."
          hideHeadingOnMobile
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
              />
            ) : null
          }>
          <>
            {queryRes.data?.totalCount ? (
              <div className="flex">
                <TeamsFilter />
                <div className="ml-auto">
                  <CreateButtonWithTeamsList
                    subtitle={t("new_workflow_subtitle").toUpperCase()}
                    createFunction={(teamId?: number) => createMutation.mutate({ teamId })}
                    isPending={createMutation.isPending}
                    disableMobileButton={true}
                    onlyShowWithTeams={true}
                  />
                </div>
              </div>
            ) : null}
            <FilterResults
              queryRes={queryRes}
              emptyScreen={<EmptyScreen isFilteredView={false} />}
              noResultsScreen={<EmptyScreen isFilteredView={true} />}
              SkeletonLoader={SkeletonLoader}>
              <WorkflowList workflows={queryRes.data?.filtered} />
            </FilterResults>
          </>
        </ShellMain>
      </LicenseRequired>
    </Shell>
  );
}

const Filter = (props: {
  profiles: {
    readOnly?: boolean | undefined;
    slug: string | null;
    name: string | null;
    teamId: number | null | undefined;
    image?: string | undefined | null;
  }[];
  checked: {
    userId: number | null;
    teamIds: number[];
  };
  setChecked: Dispatch<
    SetStateAction<{
      userId: number | null;
      teamIds: number[];
    }>
  >;
}) => {
  const session = useSession();
  const userId = session.data?.user.id || 0;
  const user = session.data?.user.name || "";
  const userName = session.data?.user.username;
  const userAvatar = `${WEBAPP_URL}/${userName}/avatar.png`;

  const teams = props.profiles.filter((profile) => !!profile.teamId);
  const { checked, setChecked } = props;

  const [noFilter, setNoFilter] = useState(true);

  return (
    <div className={classNames("-mb-2", noFilter ? "w-16" : "w-[100px]")}>
      <AnimatedPopover text={noFilter ? "All" : "Filtered"}>
        <div className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer">
          <Avatar
            imageSrc={userAvatar || ""}
            size="sm"
            alt={`${user} Avatar`}
            className="self-center"
            asChild
          />
          <label
            htmlFor="yourWorkflows"
            className="text-default ml-2 mr-auto self-center truncate text-sm font-medium">
            {user}
          </label>

          <input
            id="yourWorkflows"
            type="checkbox"
            className="text-emphasis focus:ring-emphasis dark:text-muted border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
            checked={!!checked.userId}
            onChange={(e) => {
              if (e.target.checked) {
                setChecked({ userId: userId, teamIds: checked.teamIds });
                if (checked.teamIds.length === teams.length) {
                  setNoFilter(true);
                }
              } else if (!e.target.checked) {
                setChecked({ userId: null, teamIds: checked.teamIds });

                setNoFilter(false);
              }
            }}
          />
        </div>
        {teams.map((profile) => (
          <div
            className="item-center focus-within:bg-subtle hover:bg-muted flex px-4 py-[6px] hover:cursor-pointer"
            key={`${profile.teamId || 0}`}>
            <Avatar
              imageSrc={profile.image || ""}
              size="sm"
              alt={`${profile.slug} Avatar`}
              className="self-center"
              asChild
            />
            <label
              htmlFor={profile.slug || ""}
              className="text-default ml-2 mr-auto select-none self-center truncate text-sm font-medium hover:cursor-pointer">
              {profile.slug}
            </label>

            <input
              id={profile.slug || ""}
              name={profile.slug || ""}
              type="checkbox"
              checked={checked.teamIds?.includes(profile.teamId || 0)}
              onChange={(e) => {
                if (e.target.checked) {
                  const updatedChecked = checked;
                  updatedChecked.teamIds.push(profile.teamId || 0);
                  setChecked({ userId: checked.userId, teamIds: [...updatedChecked.teamIds] });

                  if (checked.userId && updatedChecked.teamIds.length === teams.length) {
                    setNoFilter(true);
                  } else {
                    setNoFilter(false);
                  }
                } else if (!e.target.checked) {
                  const index = checked.teamIds.indexOf(profile.teamId || 0);
                  if (index !== -1) {
                    const updatedChecked = checked;
                    updatedChecked.teamIds.splice(index, 1);
                    setChecked({ userId: checked.userId, teamIds: [...updatedChecked.teamIds] });

                    if (checked.userId && updatedChecked.teamIds.length === teams.length) {
                      setNoFilter(true);
                    } else {
                      setNoFilter(false);
                    }
                  }
                }
              }}
              className="text-emphasis focus:ring-emphasis dark:text-muted border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
            />
          </div>
        ))}
      </AnimatedPopover>
    </div>
  );
};

export default WorkflowsPage;
