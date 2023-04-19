import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import type { Dispatch, SetStateAction } from "react";
import { useState, useEffect } from "react";

import Shell from "@calcom/features/shell/Shell";
import { classNames } from "@calcom/lib";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, CreateButton, showToast } from "@calcom/ui";

import LicenseRequired from "../../common/components/LicenseRequired";
import SkeletonLoader from "../components/SkeletonLoaderList";
import type { WorkflowType } from "../components/WorkflowListPage";
import WorkflowList from "../components/WorkflowListPage";

function WorkflowsPage() {
  const { t } = useLocale();
  const session = useSession();
  const router = useRouter();
  const [checkedFilterItems, setCheckedFilterItems] = useState<{ userId: number | null; teamIds: number[] }>({
    userId: session.data?.user.id || null,
    teamIds: [],
  });

  const { data: allWorkflowsData, isLoading } = trpc.viewer.workflows.list.useQuery();

  const [filteredWorkflows, setFilteredWorkflows] = useState<WorkflowType[]>([]);

  const createMutation = trpc.viewer.workflows.create.useMutation({
    onSuccess: async ({ workflow }) => {
      await router.replace("/workflows/" + workflow.id);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
      }

      if (err.data?.code === "UNAUTHORIZED") {
        const message = `${err.data.code}: You are not able to create this workflow`;
        showToast(message, "error");
      }
    },
  });

  const query = trpc.viewer.workflows.getByViewer.useQuery();

  useEffect(() => {
    const allWorkflows = allWorkflowsData?.workflows;
    if (allWorkflows && allWorkflows.length > 0) {
      const filtered = allWorkflows.filter((workflow) => {
        if (checkedFilterItems.teamIds.includes(workflow.teamId || 0)) return workflow;
        if (!workflow.teamId) {
          if (!!workflow.userId && workflow.userId === checkedFilterItems.userId) return workflow;
        }
      });
      setFilteredWorkflows(filtered);
    } else {
      setFilteredWorkflows([]);
    }
  }, [checkedFilterItems, allWorkflowsData]);

  useEffect(() => {
    if (session.status !== "loading" && !query.isLoading) {
      if (!query.data) return;
      setCheckedFilterItems({
        userId: session.data?.user.id || null,
        teamIds: query.data.profiles
          .map((profile) => {
            if (!!profile.teamId) {
              return profile.teamId;
            }
          })
          .filter((teamId): teamId is number => !!teamId),
      });
    }
  }, [session.status, query.isLoading, allWorkflowsData]);

  const profileOptions = query?.data?.profiles
    .filter((profile) => !profile.readOnly)
    .map((profile) => {
      return {
        teamId: profile.teamId,
        label: profile.name || profile.slug,
        image: profile.image,
        slug: profile.slug,
      };
    });

  return (
    <Shell
      heading={t("workflows")}
      title={t("workflows")}
      subtitle={t("workflows_to_automate_notifications")}
      CTA={
        query?.data?.profiles.length === 1 &&
        session.data?.hasValidLicense &&
        allWorkflowsData?.workflows &&
        allWorkflowsData?.workflows.length &&
        profileOptions ? (
          <CreateButton
            subtitle={t("new_workflow_subtitle").toUpperCase()}
            options={profileOptions}
            createFunction={(teamId?: number) => {
              createMutation.mutate({ teamId });
            }}
            isLoading={createMutation.isLoading}
            disableMobileButton={true}
          />
        ) : null
      }>
      <LicenseRequired>
        {isLoading ? (
          <SkeletonLoader />
        ) : (
          <>
            {query?.data?.profiles &&
            query?.data?.profiles.length > 1 &&
            allWorkflowsData?.workflows &&
            allWorkflowsData.workflows.length &&
            profileOptions ? (
              <div className="mb-4 flex">
                <Filter
                  profiles={query.data.profiles}
                  checked={checkedFilterItems}
                  setChecked={setCheckedFilterItems}
                />
                <div className="ml-auto">
                  <CreateButton
                    subtitle={t("new_workflow_subtitle").toUpperCase()}
                    options={profileOptions}
                    createFunction={(teamId?: number) => createMutation.mutate({ teamId })}
                    isLoading={createMutation.isLoading}
                    disableMobileButton={true}
                  />
                </div>
              </div>
            ) : null}
            {profileOptions && profileOptions?.length ? (
              <WorkflowList
                workflows={filteredWorkflows}
                profileOptions={profileOptions}
                hasNoWorkflows={!allWorkflowsData?.workflows || allWorkflowsData?.workflows.length === 0}
              />
            ) : null}
          </>
        )}
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
  const userAvatar = WEBAPP_URL + "/" + userName + "/avatar.png";

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
            gravatarFallbackMd5="fallback"
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
            className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
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
              gravatarFallbackMd5="fallback"
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
              className="text-primary-600 focus:ring-primary-500 border-default inline-flex h-4 w-4 place-self-center justify-self-end rounded "
            />
          </div>
        ))}
      </AnimatedPopover>
    </div>
  );
};

export default WorkflowsPage;
