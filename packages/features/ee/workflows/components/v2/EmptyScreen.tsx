import React from "react";
import { Icon as FeatherIcon } from "react-feather";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SVGComponent } from "@calcom/types/SVGComponent";
import { Icon } from "@calcom/ui/Icon";
import { Button } from "@calcom/ui/v2";

type WorkflowExampleType = {
  Icon: FeatherIcon;
  text: string;
};

function WorkflowExample(props: WorkflowExampleType) {
  const { Icon, text } = props;

  return (
    <div className="mx-3 my-3 max-h-24 max-w-[600px] rounded-md border border-solid p-6">
      <div className="flex ">
        <div className="flex w-24 items-center justify-center rounded-sm">
          <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-white">
            <Icon className="h-6 w-6 stroke-[1.5px]" />
          </div>
        </div>
        <div className="flex w-full items-center justify-center ">
          <div className="line-clamp-2 w-full text-sm leading-none">{text}</div>
        </div>
      </div>
    </div>
  );
}

export default function EmptyScreen({
  IconHeading,
  headline,
  description,
  buttonText,
  buttonOnClick,
  isLoading,
  showExampleWorkflows,
}: {
  IconHeading: SVGComponent | FeatherIcon;
  headline: string;
  description: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  isLoading: boolean;
  showExampleWorkflows: boolean;
}) {
  const { t } = useLocale();

  const workflowsExamples = [
    { icon: Icon.FiMail, text: t("workflow_example_1") },
    { icon: Icon.FiSmartphone, text: t("workflow_example_2") },
    { icon: Icon.FiMail, text: t("workflow_example_3") },
    { icon: Icon.FiMail, text: t("workflow_example_4") },
    { icon: Icon.FiSmartphone, text: t("workflow_example_5") },
    { icon: Icon.FiSmartphone, text: t("workflow_example_6") },
  ];

  return (
    <>
      <div className="min-h-80 flex w-full flex-col items-center justify-center rounded-md ">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-200 dark:bg-white">
          <IconHeading className="inline-block h-10 w-10 stroke-[1.3px] dark:bg-gray-900 dark:text-gray-600" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="text-semibold font-cal mt-6 text-xl dark:text-gray-300">{headline}</h2>
          <p className="line-clamp-2 mt-3 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">
            {description}
          </p>
          {buttonOnClick && buttonText && (
            <Button
              type="button"
              StartIcon={Icon.FiPlus}
              onClick={(e) => buttonOnClick(e)}
              loading={isLoading}
              className="mx-auto mt-8">
              {buttonText}
            </Button>
          )}
        </div>
      </div>
      {showExampleWorkflows && (
        <div className="flex flex-row items-center justify-center">
          <div className="grid-cols-none items-center lg:grid lg:grid-cols-3 xl:mx-20">
            {workflowsExamples.map((example, index) => (
              <WorkflowExample key={index} Icon={example.icon} text={example.text} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
