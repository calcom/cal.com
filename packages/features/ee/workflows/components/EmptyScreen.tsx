import React from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SVGComponent } from "@calcom/types/SVGComponent";
import { Button } from "@calcom/ui";
import { FiSmartphone, FiMail, FiPlus } from "@calcom/ui/components/icon";

type WorkflowExampleType = {
  Icon: SVGComponent;
  text: string;
};

function WorkflowExample(props: WorkflowExampleType) {
  const { Icon, text } = props;

  return (
    <div className="mx-2 my-2 max-h-24 max-w-[600px] rounded-md border border-solid p-6">
      <div className="flex ">
        <div className="flex items-center justify-center">
          <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-white">
            <Icon className="h-6 w-6 stroke-[2px] text-gray-700" />
          </div>
        </div>
        <div className="m-auto w-full flex-grow items-center justify-center ">
          <div className="line-clamp-2 text-semibold w-full text-sm font-medium leading-none text-gray-900">
            {text}
          </div>
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
  IconHeading: SVGComponent;
  headline: string;
  description: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  isLoading: boolean;
  showExampleWorkflows: boolean;
}) {
  const { t } = useLocale();

  const workflowsExamples = [
    { icon: FiSmartphone, text: t("workflow_example_1") },
    { icon: FiSmartphone, text: t("workflow_example_2") },
    { icon: FiMail, text: t("workflow_example_3") },
    { icon: FiMail, text: t("workflow_example_4") },
    { icon: FiMail, text: t("workflow_example_5") },
    { icon: FiSmartphone, text: t("workflow_example_6") },
  ];
  // new workflow example when 'after meetings ends' trigger is implemented: Send custom thank you email to attendee after event (FiSmile icon),

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
              StartIcon={FiPlus}
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
