import React, { ReactNode } from "react";
import { Icon as FeatherIcon } from "react-feather";

import { SVGComponent } from "@calcom/types/SVGComponent";
import { Icon } from "@calcom/ui/Icon";
import { Button } from "@calcom/ui/v2";

const workflowsExamples = [
  { icon: Icon.FiMail, text: "Send Email reminder 24 hours before event starts to host" },
  { icon: Icon.FiSmartphone, text: "Send SMS reminder 1 hour before event starts to host" },
  { icon: Icon.FiMail, text: "Send email reminder 1 hour before event starts to host" },
  { icon: Icon.FiMail, text: "Send Email reminder 24 hours before event starts to attendee" },
  { icon: Icon.FiSmartphone, text: "Send SMS reminder 1 hour before event starts to attendee" },
  { icon: Icon.FiMail, text: "Send email reminder 1 hour before event starts to attendee" },
];

type WorkflowExampleType = {
  Icon: FeatherIcon;
  text: string;
};

function WorkflowExample(props: WorkflowExampleType) {
  const { Icon, text } = props;

  return (
    <div className="mx-3 my-3 rounded-md border border-solid py-5 pr-5">
      <div className="flex">
        <div className="flex w-24 items-center justify-center rounded-sm">
          <div className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-gray-200 dark:bg-white">
            <Icon className="h-6 w-6 stroke-[1.5px]" />
          </div>
        </div>
        <div className="w-full text-sm">{text}</div>
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
}: {
  IconHeading: SVGComponent | FeatherIcon;
  headline: string;
  description: string | React.ReactElement;
  buttonText?: string;
  buttonOnClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
}) {
  return (
    <>
      <div className="min-h-80 flex w-full flex-col items-center justify-center rounded-sm ">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gray-200 dark:bg-white">
          <IconHeading className="inline-block h-10 w-10 stroke-[1.3px] dark:bg-gray-900 dark:text-gray-600" />
        </div>
        <div className="max-w-[420px] text-center">
          <h2 className="text-semibold font-cal mt-6 text-xl dark:text-gray-300">{headline}</h2>
          <p className="line-clamp-2 mt-3 mb-8 text-sm font-normal leading-6 text-gray-700 dark:text-gray-300">
            {description}
          </p>
          {buttonOnClick && buttonText && (
            <Button StartIcon={Icon.FiPlus} onClick={(e) => buttonOnClick(e)}>
              {buttonText}
            </Button>
          )}
        </div>
      </div>
      <div className="mx-20 grid grid-cols-3">
        {workflowsExamples.map((example, index) => (
          <WorkflowExample key={index} Icon={example.icon} text={example.text} />
        ))}
      </div>
    </>
  );
}
