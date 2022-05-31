import { useLocale } from "@calcom/lib/hooks/useLocale";

import { withQuery } from "@lib/QueryCell";
import { inferQueryOutput } from "@lib/trpc";

import Shell from "@components/Shell";
import SkeletonLoader from "@components/availability/SkeletonLoader";
import { NewWorkflowButton } from "@components/workflows/NewWorkflowButton";

const WithQuery = withQuery(["viewer.workflows.list"]);

export default function Workflows() {
  const { t } = useLocale();

  return (
    <div>
      <Shell
        heading={t("workflows")}
        subtitle={t("workflows_to_automate_notifications")}
        CTA={<NewWorkflowButton />}
        customLoader={<SkeletonLoader />}>
        <WithQuery success={({ data }) => <WorkflowList {...data} />} customLoader={<SkeletonLoader />} />
      </Shell>
    </div>
  );
}

export const WorkflowList = ({ workflows }: inferQueryOutput<"viewer.workflows.list">): JSX.Element => {
  const { t } = useLocale();

  return (
    <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
      <ul className="divide-y divide-neutral-200">
        {workflows.map((workflow) => (
          <li key={workflow.id}>
            <div className="group w-full items-center justify-between px-4 py-4 hover:bg-neutral-50 sm:px-6">
              <div className="mt-4 hidden sm:mt-0 sm:flex">
                <div className="justify-between rtl:space-x-reverse">
                  <div className="max-w-56 truncate text-sm font-medium leading-6 text-neutral-900 md:max-w-max">
                    {workflow.name}
                  </div>
                  <div className="max-w-52 md:max-w-96 truncate text-sm text-gray-500">
                    {t("triggers")} {t(`${workflow.trigger.toLowerCase()}_trigger`)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
