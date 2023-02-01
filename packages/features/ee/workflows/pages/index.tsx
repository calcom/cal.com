import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import { useState, Dispatch, SetStateAction, useEffect } from "react";

import Shell from "@calcom/features/shell/Shell";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { HttpError } from "@calcom/lib/http-error";
import { trpc } from "@calcom/trpc/react";
import { AnimatedPopover, Avatar, CreateButton, showToast } from "@calcom/ui";

import LicenseRequired from "../../common/components/v2/LicenseRequired";
import SkeletonLoader from "../components/SkeletonLoaderList";
import WorkflowList from "../components/WorkflowListPage";
import { Workflow } from ".prisma/client";

function WorkflowsPage() {
  const { t } = useLocale();
  const session = useSession();
  const router = useRouter();
  const [checkedFilterItems, setCheckedFilterItems] = useState<{ userId: number | null; teamIds: number[] }>({
    userId: session.data?.user.id || null,
    teamIds: [],
  });

  const allWorkflowsQuery = trpc.viewer.workflows.list.useQuery();
  const { data: allWorkflowsData, isLoading } = allWorkflowsQuery;

  const [filteredWorkflows, setFilteredWorkflows] = useState<Workflow[]>([]);

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
        if (!!workflow.userId && workflow.userId === checkedFilterItems.userId) return workflow;
        if (checkedFilterItems.teamIds.includes(workflow.teamId || 0)) return workflow;
      });
      setFilteredWorkflows(filtered);
    }
  }, [checkedFilterItems]);

  useEffect(() => {
    if (session.status !== "loading" && !query.isLoading) {
      if (!query.data!) return;
      setCheckedFilterItems({
        userId: session.data?.user.id || null,
        teamIds: query.data.profiles
          .map((profile) => {
            if (!!profile.teamId) {
              return profile.teamId;
            }
          })
          .filter((teamId) => !!teamId) as number[],
      });
    }
  }, [session.status, query.isLoading]);

  if (!query.data) return null;

  return (
    <Shell
      heading={t("workflows")}
      title={t("workflows")}
      subtitle={t("workflows_to_automate_notifications")}
      CTA={
        session.data?.hasValidLicense &&
        allWorkflowsData?.workflows &&
        allWorkflowsData?.workflows.length > 0 ? (
          // <Button
          //   variant="fab"
          //   StartIcon={FiPlus}
          //   onClick={() => createMutation.mutate()}
          //   loading={createMutation.isLoading}>
          //   {t("new")}
          // </Button>
          <CreateButton
            subtitle={t("new_workflow_subtitle").toUpperCase()}
            canAdd={true}
            options={query.data.profiles}
            createFunction={(teamId?: number) => createMutation.mutate({ teamId })}
          />
        ) : (
          <></>
        )
      }>
      <LicenseRequired>
        {isLoading ? (
          <SkeletonLoader />
        ) : (
          <>
            {allWorkflowsData?.workflows && allWorkflowsData.workflows.length > 0 && (
              <Filter
                profiles={query.data.profiles}
                checked={checkedFilterItems}
                setChecked={setCheckedFilterItems}
              />
            )}
            <WorkflowList
              workflows={filteredWorkflows}
              profiles={query.data.profiles}
              hasNoWorkflows={!allWorkflowsData?.workflows || allWorkflowsData?.workflows.length === 0}
            />
          </>
        )}
      </LicenseRequired>
    </Shell>
  );
}

const Filter = (props: {
  profiles: {
    membershipCount?: number | undefined;
    readOnly?: boolean | undefined;
    slug: string | null;
    name: string | null;
    teamId: number | null | undefined;
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
  const { t } = useLocale();
  const session = useSession();
  const userId = session.data?.user.id || 0;
  const userName = session.data?.user.name || "";

  const teams = props.profiles.filter((profile) => !!profile.teamId);
  const teamNames = teams.map((profile) => profile.name);
  const { checked, setChecked } = props;

  return (
    <AnimatedPopover text={teamNames && teamNames.length > 0 ? `${teamNames.join(", ")}` : ""}>
      <div className="item-center flex px-4 py-[6px] focus-within:bg-gray-100 hover:cursor-pointer hover:bg-gray-50">
        <Avatar
          imageSrc=""
          size="sm"
          alt={`${userName} Avatar`}
          gravatarFallbackMd5="fallback"
          className="self-center"
          asChild
        />
        <label
          htmlFor="yourWorkflows"
          className="ml-2 mr-auto self-center truncate text-sm font-medium text-gray-700">
          {userName}
        </label>

        <input
          id="yourWorkflows"
          type="checkbox"
          className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
          checked={!!checked.userId}
          onChange={(e) => {
            if (e.target.checked) {
              setChecked({ userId: userId, teamIds: checked.teamIds });
            } else if (!e.target.checked) {
              setChecked({ userId: null, teamIds: checked.teamIds });
            }
          }}
        />
      </div>
      {teams.map((profile) => (
        <div
          className="item-center flex px-4 py-[6px] focus-within:bg-gray-100 hover:cursor-pointer hover:bg-gray-50"
          key={`${profile.teamId || 0}`}>
          <Avatar
            imageSrc=""
            size="sm"
            alt={`${profile.slug} Avatar`}
            gravatarFallbackMd5="fallback"
            className="self-center"
            asChild
          />
          <label
            htmlFor={profile.slug || ""}
            className="ml-2 mr-auto select-none self-center truncate text-sm font-medium text-gray-700 hover:cursor-pointer">
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
              } else if (!e.target.checked) {
                const index = checked.teamIds.indexOf(profile.teamId || 0);
                if (index !== -1) {
                  const updatedChecked = checked;
                  updatedChecked.teamIds.splice(index, 1);
                  setChecked({ userId: checked.userId, teamIds: [...updatedChecked.teamIds] });
                }
              }
            }}
            className="text-primary-600 focus:ring-primary-500 inline-flex h-4 w-4 place-self-center justify-self-end rounded border-gray-300 "
          />
        </div>
      ))}
    </AnimatedPopover>
  );
};

export default WorkflowsPage;
